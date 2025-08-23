import { uploadFile, deleteFile, listFiles, generateObjectKey, validateFile } from '../utils/minio.js';
import { 
  processGachaImage, 
  processItemImage, 
  generateResponsiveImageSet,
  getProcessingStatistics,
  retryFailedProcessing
} from '../utils/imageProcessor.js';
import { v4 as uuidv4 } from 'uuid';

async function imageRoutes(fastify, options) {
  // ファイルアップロード設定
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 1
    }
  });

  // 画像一覧取得
  fastify.get('/', {
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const files = await listFiles(userId);
        
        return reply.send({
          images: files,
          total: files.length
        });
      } catch (error) {
        fastify.log.error('Error listing images:', error);
        return reply.code(500).send({ 
          error: 'Failed to list images',
          details: error.message 
        });
      }
    }
  });

  // アイテム画像アップロード（Sharp.js処理付き）
  fastify.post('/upload/item', {
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const data = await request.file();
        
        if (!data) {
          return reply.code(400).send({
            success: false,
            message: 'No file uploaded'
          });
        }

        // ファイル検証
        validateFile(data);

        // ファイルバッファを取得
        const buffer = await data.toBuffer();
        const userId = request.user.userId;
        
        // Sharp.js処理でアイテム画像を保存
        const result = await processItemImage(
          fastify.pg, 
          buffer, 
          userId, 
          data.filename, 
          true // isPublic
        );

        if (result.success) {
          // レスポンシブ画像セット生成
          const imageSet = generateResponsiveImageSet(result.variants[0].objectKey.split('/').slice(0, -1).join('/'));
          
          reply.send({
            success: true,
            itemImageId: result.itemImageId,
            processingStatus: result.processingStatus,
            statistics: result.statistics,
            imageSet,
            variants: result.variants,
            errors: result.errors
          });
        } else {
          reply.code(500).send({
            success: false,
            message: 'Image processing failed',
            error: result.error
          });
        }
      } catch (error) {
        console.error('Item image upload error:', error);
        reply.code(400).send({
          success: false,
          message: error.message || 'Upload failed'
        });
      }
    }
  });

  // 画像アップロード（従来版 - 後方互換性のため維持）
  fastify.post('/upload', {
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const data = await request.file();
        
        if (!data) {
          return reply.code(400).send({
            success: false,
            message: 'No file uploaded'
          });
        }

        // ファイル検証
        validateFile(data);

        // ファイルバッファを取得
        const buffer = await data.toBuffer();
        
        // オブジェクトキー生成
        const objectKey = generateObjectKey(request.user.userId, data.filename);
        
        // メタデータ（ファイル名をBase64エンコード）
        const metadata = {
          'x-amz-meta-original-name': Buffer.from(data.filename, 'utf8').toString('base64'),
          'x-amz-meta-uploaded-by': request.user.userId.toString(),
          'x-amz-meta-uploaded-at': new Date().toISOString()
        };

        // MinIOにアップロード
        const result = await uploadFile(objectKey, buffer, data.mimetype, metadata);

        reply.send({
          success: true,
          url: result.url,
          object_key: objectKey,
          metadata: {
            filename: data.filename,
            size: buffer.length,
            mimeType: data.mimetype,
            uploadedAt: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Upload error:', error);
        reply.code(400).send({
          success: false,
          message: error.message || 'Upload failed'
        });
      }
    }
  });

  // 画像削除
  fastify.delete('/:objectKey', {
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const { objectKey } = request.params;
        const userId = request.user.userId;
        
        // オブジェクトキーがユーザーのものかチェック
        if (!objectKey.startsWith(`users/${userId}/`)) {
          return reply.code(403).send({
            success: false,
            message: 'Access denied'
          });
        }

        // 使用中かチェック
        const usageQuery = `
          SELECT COUNT(*) as count
          FROM gacha_items 
          WHERE gacha_id IN (
            SELECT id FROM gachas WHERE user_id = $1
          ) AND image_url LIKE $2
        `;
        
        const usageResult = await fastify.pg.query(usageQuery, [
          userId, 
          `%${objectKey}`
        ]);
        
        if (parseInt(usageResult.rows[0].count) > 0) {
          return reply.code(400).send({
            success: false,
            message: 'Image is currently in use and cannot be deleted'
          });
        }

        // MinIOから削除
        await deleteFile(objectKey);

        reply.send({
          success: true,
          message: 'Image deleted successfully'
        });
      } catch (error) {
        console.error('Delete image error:', error);
        reply.code(500).send({
          success: false,
          message: 'Failed to delete image'
        });
      }
    }
  });

  // ガチャ画像アップロード（Sharp.js処理付き）
  fastify.post('/upload/gacha/:gachaId', {
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const { gachaId } = request.params;
        const { displayOrder, isMain } = request.query;
        const data = await request.file();
        
        if (!data) {
          return reply.code(400).send({
            success: false,
            message: 'No file uploaded'
          });
        }

        // ガチャの所有者確認
        const gachaCheck = await fastify.pg.query(
          'SELECT user_id FROM gachas WHERE id = $1',
          [gachaId]
        );
        
        if (gachaCheck.rows.length === 0) {
          return reply.code(404).send({
            success: false,
            message: 'Gacha not found'
          });
        }
        
        if (gachaCheck.rows[0].user_id !== request.user.userId) {
          return reply.code(403).send({
            success: false,
            message: 'Access denied'
          });
        }

        // ファイル検証
        validateFile(data);

        // ファイルバッファを取得
        const buffer = await data.toBuffer();
        
        // Sharp.js処理でガチャ画像を保存
        const result = await processGachaImage(
          fastify.pg, 
          buffer, 
          parseInt(gachaId),
          data.filename, 
          parseInt(displayOrder) || 1,
          isMain === 'true'
        );

        if (result.success) {
          // レスポンシブ画像セット生成
          const baseObjectKey = result.variants[0].objectKey.split('/').slice(0, -1).join('/');
          const imageSet = generateResponsiveImageSet(baseObjectKey);
          
          reply.send({
            success: true,
            gachaImageId: result.gachaImageId,
            processingStatus: result.processingStatus,
            statistics: result.statistics,
            imageSet,
            variants: result.variants,
            errors: result.errors
          });
        } else {
          reply.code(500).send({
            success: false,
            message: 'Gacha image processing failed',
            error: result.error
          });
        }
      } catch (error) {
        console.error('Gacha image upload error:', error);
        reply.code(400).send({
          success: false,
          message: error.message || 'Upload failed'
        });
      }
    }
  });

  // 画像処理統計情報取得
  fastify.get('/processing/stats', {
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const stats = await getProcessingStatistics(fastify.pg);
        reply.send({
          success: true,
          statistics: stats
        });
      } catch (error) {
        console.error('Get processing stats error:', error);
        reply.code(500).send({
          success: false,
          message: 'Failed to get processing statistics',
          error: error.message
        });
      }
    }
  });

  // 失敗した画像処理の再試行
  fastify.post('/processing/retry', {
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const result = await retryFailedProcessing(fastify.pg);
        reply.send({
          success: true,
          message: `${result.length} images marked for retry`,
          retryList: result
        });
      } catch (error) {
        console.error('Retry processing error:', error);
        reply.code(500).send({
          success: false,
          message: 'Failed to retry processing',
          error: error.message
        });
      }
    }
  });

  // 画像配信（バリアント対応）
  fastify.get('/serve/:gachaId/images/:imageId/:variant', {
    handler: async (request, reply) => {
      try {
        const { gachaId, imageId, variant } = request.params;
        
        // バリアント情報をパース（例: desktop.webp）
        const [sizeType, formatType] = variant.split('.');
        
        // DBから画像バリアント情報を取得
        const variantQuery = `
          SELECT iv.object_key, iv.file_size 
          FROM image_variants iv
          JOIN gacha_images gi ON iv.gacha_image_id = gi.id
          WHERE gi.gacha_id = $1 
          AND gi.base_object_key LIKE $2
          AND iv.size_type = $3 
          AND iv.format_type = $4
        `;
        
        const variantResult = await fastify.pg.query(variantQuery, [
          gachaId,
          `%${imageId}%`,
          sizeType,
          formatType
        ]);
        
        if (variantResult.rows.length === 0) {
          return reply.code(404).send({
            success: false,
            message: 'Image variant not found'
          });
        }
        
        const objectKey = variantResult.rows[0].object_key;
        
        // MinIOから画像ストリーム取得
        const stream = await fastify.minio.getObject('images', objectKey);
        
        reply.type(`image/${formatType}`);
        reply.header('Cache-Control', 'public, max-age=31536000'); // 1年キャッシュ
        reply.send(stream);
        
      } catch (error) {
        console.error('Serve image error:', error);
        reply.code(500).send({
          success: false,
          message: 'Failed to serve image'
        });
      }
    }
  });

  // 画像使用状況確認
  fastify.get('/:objectKey/usage', {
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const { objectKey } = request.params;
        const userId = request.user.userId;
        
        // オブジェクトキーがユーザーのものかチェック
        if (!objectKey.startsWith(`users/${userId}/`)) {
          return reply.code(403).send({
            success: false,
            message: 'Access denied'
          });
        }

        const usageQuery = `
          SELECT gi.name as item_name, g.name as gacha_name, gi.id as item_id, g.id as gacha_id
          FROM gacha_items gi
          JOIN gachas g ON gi.gacha_id = g.id
          WHERE g.user_id = $1 AND gi.image_url LIKE $2
        `;
        
        const result = await fastify.pg.query(usageQuery, [
          userId, 
          `%${objectKey}`
        ]);

        reply.send({
          object_key: objectKey,
          in_use: result.rows.length > 0,
          usage_details: result.rows
        });
      } catch (error) {
        console.error('Check usage error:', error);
        reply.code(500).send({
          success: false,
          message: 'Failed to check image usage'
        });
      }
    }
  });
}

export default imageRoutes;
