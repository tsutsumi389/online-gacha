import { uploadFile, deleteFile, listFiles, generateObjectKey, validateFile } from '../utils/minio.js';
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

  // 画像アップロード
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
