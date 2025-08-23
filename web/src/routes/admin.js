// ユーザーガチャ管理ルート（全ユーザー用）
import Gacha from '../models/Gacha.js';
import database from '../config/database.js';
import { createGachaSchema, updateGachaSchema, createGachaItemSchema, updateGachaItemSchema } from '../schemas/validation.js';
import { uploadFile, generateGachaImageObjectKey, validateFile, deleteFile } from '../utils/minio.js';
import { 
  processGachaImage, 
  generateResponsiveImageSet,
  generateImageUrl,
  getProcessingStatistics,
  retryFailedProcessing
} from '../utils/imageProcessor.js';

export default async function userGachaRoutes(fastify, options) {
  // ファイルアップロード設定
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 1
    }
  });

  // ユーザーのガチャ一覧取得
  fastify.get('/gachas', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const {
        search = '',
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = request.query;

      // パラメータバリデーション
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit))); // 最大100件
      const offset = (pageNum - 1) * limitNum;

      // ソート項目のバリデーション
      const allowedSortBy = ['name', 'created_at', 'price', 'is_public'];
      const validSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'created_at';
      const validSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // ユーザーのガチャ一覧取得
      const result = await Gacha.findAllForUser({
        userId: request.user.userId,
        search,
        offset,
        limit: limitNum,
        sortBy: validSortBy,
        sortOrder: validSortOrder
      });

      return reply.send({
        gachas: result.gachas.map(gacha => {
          // 生のデータベースレコードをGachaインスタンスに変換
          if (typeof gacha.toJSON === 'function') {
            return gacha.toJSON();
          } else {
            // 生のデータベースレコードの場合は手動で変換
            return {
              id: gacha.id,
              name: gacha.name,
              description: gacha.description,
              price: gacha.price,
              userId: gacha.user_id,
              isPublic: gacha.is_public,
              displayFrom: gacha.display_from,
              displayTo: gacha.display_to,
              createdAt: gacha.created_at,
              updatedAt: gacha.updated_at,
              itemCount: gacha.item_count,
              playCount: gacha.play_count
            };
          }
        }),
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(result.totalCount / limitNum),
          totalItems: result.totalCount,
          itemsPerPage: limitNum
        }
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ユーザーのガチャ削除
  fastify.delete('/gachas/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);

      if (isNaN(gachaId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID' });
      }

      // ガチャの存在確認と所有者チェック
      const gacha = await Gacha.findByIdForUser(gachaId, request.user.userId);
      if (!gacha) {
        return reply.code(404).send({ error: 'Gacha not found or access denied' });
      }

      // ガチャ削除（カスケード削除）
      await Gacha.deleteByIdForUser(gachaId, request.user.userId);

      return reply.send({
        message: 'Gacha deleted successfully',
        deletedGachaId: gachaId
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ユーザーのガチャ作成
  fastify.post('/gachas', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      // リクエストボディをログ出力
      fastify.log.info('Create gacha request body:', request.body);

      // バリデーション
      const { error, value } = createGachaSchema.validate(request.body);
      if (error) {
        fastify.log.error('Validation error:', error.details);
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.details[0].message,
          field: error.details[0].path.join('.'),
          receivedValue: error.details[0].context.value
        });
      }

      // ガチャ作成
      const newGacha = await Gacha.createForUser({
        ...value,
        userId: request.user.userId
      });

      return reply.code(201).send({
        message: 'Gacha created successfully',
        gacha: newGacha.toJSON()
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ユーザーのガチャ更新
  fastify.put('/gachas/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);

      if (isNaN(gachaId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID' });
      }

      // バリデーション
      const { error, value } = updateGachaSchema.validate(request.body);
      if (error) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.details[0].message
        });
      }

      // ガチャの存在確認と所有者チェック
      const existingGacha = await Gacha.findByIdForUser(gachaId, request.user.userId);
      if (!existingGacha) {
        return reply.code(404).send({ error: 'Gacha not found or access denied' });
      }

      // ガチャ更新
      const updatedGachaData = await Gacha.update(gachaId, {
        name: value.name,
        description: value.description,
        price: value.price,
        is_public: value.isPublic,
        display_from: value.displayFrom,
        display_to: value.displayTo
      }, request.user.userId);

      if (!updatedGachaData) {
        return reply.code(404).send({ error: 'Gacha not found or update failed' });
      }

      // Gachaインスタンスを作成
      const updatedGacha = new Gacha(updatedGachaData);

      return reply.send({
        message: 'Gacha updated successfully',
        gacha: updatedGacha.toJSON()
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ユーザーのガチャ公開状態切り替え
  fastify.put('/gachas/:id/toggle-public', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);

      if (isNaN(gachaId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID' });
      }

      // ガチャの存在確認と所有者チェック
      const gacha = await Gacha.findByIdForUser(gachaId, request.user.userId);
      if (!gacha) {
        return reply.code(404).send({ error: 'Gacha not found or access denied' });
      }

      // 公開状態切り替え
      const updatedGacha = await Gacha.togglePublicForUser(gachaId, request.user.userId);

      return reply.send({
        message: 'Gacha visibility toggled successfully',
        gacha: updatedGacha
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ユーザーのガチャ詳細取得（アイテム付き）
  fastify.get('/gachas/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);

      if (isNaN(gachaId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID' });
      }

      // ガチャの詳細取得
      const gachaData = await Gacha.findByIdForUser(gachaId, request.user.userId);
      if (!gachaData) {
        return reply.code(404).send({ error: 'Gacha not found or access denied' });
      }

      // Gachaインスタンスを作成してレスポンス
      const gacha = new Gacha(gachaData);
      
      return reply.send({
        gacha: gacha.toJSON()
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ガチャアイテム一覧取得
  fastify.get('/gachas/:id/items', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);

      if (isNaN(gachaId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID' });
      }

      // ガチャの所有者チェック
      const gacha = await Gacha.findByIdForUser(gachaId, request.user.userId);
      if (!gacha) {
        return reply.code(404).send({ error: 'Gacha not found or access denied' });
      }

      // ガチャアイテム一覧取得
      const items = await Gacha.getItemsForUser(gachaId, request.user.userId);

      return reply.send({ items });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ガチャアイテム作成（画像付き）
  fastify.post('/gachas/:id/items', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);

      if (isNaN(gachaId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID' });
      }

      // バリデーション
      const { error, value } = createGachaItemSchema.validate(request.body);
      if (error) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.details[0].message
        });
      }

      // ガチャの所有者チェック
      const gacha = await Gacha.findByIdForUser(gachaId, request.user.userId);
      if (!gacha) {
        return reply.code(404).send({ error: 'Gacha not found or access denied' });
      }

      // 画像URLの検証（MinIOからアップロードされた画像の場合）
      if (value.imageUrl) {
        const minioHost = process.env.MINIO_PUBLIC_ENDPOINT || 'localhost';
        const minioPort = process.env.MINIO_PORT || '9000';
        const expectedPrefix = `http://${minioHost}:${minioPort}/gacha-images/users/${request.user.userId}/`;
        
        if (!value.imageUrl.startsWith(expectedPrefix)) {
          return reply.code(400).send({ 
            error: 'Invalid image URL. Please upload image through the image upload API.'
          });
        }
      }

      // アイテム作成（image_urlフィールドを使用）
      const itemData = {
        ...value,
        image_url: value.imageUrl // API側のcamelCaseをDB側のsnake_caseに変換
      };
      delete itemData.imageUrl;

      const newItem = await Gacha.createItemForUser(gachaId, itemData, request.user.userId);

      return reply.code(201).send({
        message: 'Gacha item created successfully',
        item: newItem
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ガチャアイテム更新（画像付き）
  fastify.put('/gachas/:gachaId/items/:itemId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.gachaId);
      const itemId = parseInt(request.params.itemId);

      if (isNaN(gachaId) || isNaN(itemId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID or item ID' });
      }

      // バリデーション
      const { error, value } = updateGachaItemSchema.validate(request.body);
      if (error) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.details[0].message
        });
      }

      // ガチャの所有者チェック
      const gacha = await Gacha.findByIdForUser(gachaId, request.user.userId);
      if (!gacha) {
        return reply.code(404).send({ error: 'Gacha not found or access denied' });
      }

      // 画像URLの検証（MinIOからアップロードされた画像の場合）
      if (value.imageUrl) {
        const minioHost = process.env.MINIO_PUBLIC_ENDPOINT || 'localhost';
        const minioPort = process.env.MINIO_PORT || '9000';
        const expectedPrefix = `http://${minioHost}:${minioPort}/gacha-images/users/${request.user.userId}/`;
        
        if (!value.imageUrl.startsWith(expectedPrefix)) {
          return reply.code(400).send({ 
            error: 'Invalid image URL. Please upload image through the image upload API.' 
          });
        }
      }

      // アイテム更新
      const updatedItem = await Gacha.updateItemForUser(gachaId, itemId, value, request.user.userId);

      return reply.send({
        message: 'Gacha item updated successfully',
        item: updatedItem
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ガチャアイテム削除（画像も削除）
  fastify.delete('/gachas/:gachaId/items/:itemId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.gachaId);
      const itemId = parseInt(request.params.itemId);

      if (isNaN(gachaId) || isNaN(itemId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID or item ID' });
      }

      // ガチャの所有者チェック
      const gacha = await Gacha.findByIdForUser(gachaId, request.user.userId);
      if (!gacha) {
        return reply.code(404).send({ error: 'Gacha not found or access denied' });
      }

      // 削除前にアイテム情報を取得（画像URL取得のため）
      const itemQuery = 'SELECT image_url FROM gacha_items WHERE id = $1 AND gacha_id = $2';
      const itemResult = await database.query(itemQuery, [itemId, gachaId]);
      
      if (itemResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Item not found' });
      }

      const imageUrl = itemResult.rows[0].image_url;

      // アイテム削除
      await Gacha.deleteItemForUser(gachaId, itemId, request.user.userId);

      // MinIO画像も削除（存在する場合）
      if (imageUrl) {
        try {
          const minioHost = process.env.MINIO_PUBLIC_ENDPOINT || 'localhost';
          const minioPort = process.env.MINIO_PORT || '9000';
          const expectedPrefix = `http://${minioHost}:${minioPort}/gacha-images/users/${request.user.userId}/`;
          
          if (imageUrl.startsWith(expectedPrefix)) {
            // URLからオブジェクトキーを抽出
            const objectKey = imageUrl.replace(`http://${minioHost}:${minioPort}/gacha-images/`, '');
            
            // MinIOから画像削除を試行
            const deleteResponse = await fetch(`http://localhost:8080/api/admin/images/${encodeURIComponent(objectKey)}`, {
              method: 'DELETE',
              headers: {
                'Authorization': request.headers.authorization
              }
            });

            if (!deleteResponse.ok) {
              fastify.log.warn(`Failed to delete image from MinIO: ${objectKey}`);
            }
          }
        } catch (imageDeleteError) {
          fastify.log.warn('Failed to delete associated image:', imageDeleteError);
          // 画像削除失敗してもアイテム削除は成功とする
        }
      }

      return reply.send({
        message: 'Gacha item deleted successfully',
        deletedItemId: itemId
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ガチャ画像管理エンドポイント

  // ガチャ画像一覧取得
  fastify.get('/gachas/:id/images', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);
      if (isNaN(gachaId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID' });
      }

      // まずガチャの存在確認
      const gacha = await Gacha.findByIdForUser(gachaId, request.user.userId);
      if (!gacha) {
        return reply.code(404).send({ error: 'Gacha not found' });
      }

      const images = await Gacha.getGachaImages(gachaId, request.user.userId);
      
      console.log('Raw images from DB:', images.length);
      if (images.length > 0) {
        console.log('First image:', images[0]);
      }

      const responseImages = images.map(img => {
        // MinIO の直接URLを使用（認証不要）
        let imageUrl = null;
        let imageSet = null;
        
        if (img.variants && img.variants.length > 0) {
          // desktop.webp を優先的に探す
          const desktopWebp = img.variants.find(v => v.sizeType === 'desktop' && v.formatType === 'webp');
          if (desktopWebp) {
            imageUrl = desktopWebp.imageUrl; // MinIO の直接URL
          } else {
            // fallback: 最初のバリアント
            imageUrl = img.variants[0].imageUrl;
          }
          
          // レスポンシブ画像セットもMinIO URLsで構築
          imageSet = {
            sources: [
              {
                type: 'image/avif',
                srcSet: img.variants
                  .filter(v => v.formatType === 'avif')
                  .map(v => `${v.imageUrl} ${v.width}w`)
                  .join(', ')
              },
              {
                type: 'image/webp', 
                srcSet: img.variants
                  .filter(v => v.formatType === 'webp')
                  .map(v => `${v.imageUrl} ${v.width}w`)
                  .join(', ')
              },
              {
                type: 'image/jpeg',
                srcSet: img.variants
                  .filter(v => v.formatType === 'jpeg')
                  .map(v => `${v.imageUrl} ${v.width}w`)
                  .join(', ')
              }
            ].filter(source => source.srcSet.length > 0),
            fallback: img.variants.find(v => v.sizeType === 'desktop' && v.formatType === 'jpeg')?.imageUrl || imageUrl
          };
        }
        
        console.log(`Image ${img.id}: using MinIO URL=${imageUrl}`);
        
        return {
          id: img.id,
          gachaId: img.gacha_id,
          originalFilename: img.original_filename,
          baseObjectKey: img.base_object_key,
          originalSize: img.original_size,
          originalMimeType: img.original_mime_type,
          displayOrder: img.display_order,
          isMain: img.is_main,
          processingStatus: img.processing_status,
          variantCount: img.variant_count,
          variants: img.variants || [],
          // MinIO の直接URLを使用
          imageSet: imageSet,
          imageUrl: imageUrl,
          // 統計情報
          statistics: {
            totalVariants: img.variant_count || 0,
            expectedVariants: 12, // 4サイズ × 3フォーマット
            successRate: img.variant_count ? Math.round((img.variant_count / 12) * 100) : 0
          },
          createdAt: img.created_at,
          updatedAt: img.updated_at
        };
      });
      
      console.log('Sending response with', responseImages.length, 'images');

      return reply.send({
        images: responseImages
      });

    } catch (error) {
      fastify.log.error(error);
      if (error.message === 'Gacha not found or access denied') {
        return reply.code(404).send({ error: 'Gacha not found' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ガチャ画像アップロード（Sharp.js対応）
  fastify.post('/gachas/:id/images/upload', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);
      if (isNaN(gachaId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID' });
      }

      // multipart/form-dataを処理
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // ガチャの所有者確認
      const gacha = await Gacha.findByIdForUser(gachaId, request.user.userId);
      if (!gacha) {
        return reply.code(404).send({ error: 'Gacha not found' });
      }

      // ファイル検証
      validateFile(data);

      // ファイルバッファを取得
      const buffer = await data.toBuffer();
      
      // 表示順序とメイン画像フラグを取得
      const { displayOrder, isMain } = request.query;
      
      // Sharp.js処理でガチャ画像を保存
      const result = await processGachaImage(
        database, 
        buffer, 
        gachaId,
        data.filename, 
        parseInt(displayOrder) || 1,
        isMain === 'true'
      );

      if (result.success) {
        // レスポンシブ画像セット生成
        const baseObjectKey = result.variants[0].objectKey.split('/').slice(0, -1).join('/');
        const imageSet = generateResponsiveImageSet(baseObjectKey);
        
        return reply.send({
          success: true,
          gachaImage: {
            id: result.gachaImageId,
            gachaId: gachaId,
            originalFilename: data.filename,
            baseObjectKey,
            processingStatus: result.processingStatus,
            createdAt: new Date().toISOString()
          },
          processing: {
            statistics: result.statistics,
            variants: result.variants.length,
            errors: result.errors.length
          },
          imageSet,
          variants: result.variants,
          errors: result.errors
        });
      } else {
        return reply.code(500).send({
          success: false,
          error: 'Image processing failed',
          details: result.error
        });
      }
    } catch (error) {
      console.error('Gacha image upload error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Upload failed',
        details: error.message
      });
    }
  });

  // ガチャ画像削除
  fastify.delete('/gachas/:id/images/:imageId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);
      const imageId = parseInt(request.params.imageId);
      
      if (isNaN(gachaId) || isNaN(imageId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID or image ID' });
      }

      // 画像情報を取得（MinIO削除用）
      const imageQuery = `
        SELECT object_key, image_url 
        FROM gacha_images 
        WHERE id = $1 AND gacha_id = $2
      `;
      const imageResult = await database.query(imageQuery, [imageId, gachaId]);
      
      if (imageResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Image not found' });
      }

      const { object_key } = imageResult.rows[0];

      // データベースから画像レコード削除
      await Gacha.deleteGachaImage(gachaId, imageId, request.user.userId);

      // MinIOから画像削除
      try {
        await deleteFile(object_key);
      } catch (minioError) {
        fastify.log.warn('Failed to delete image from MinIO:', minioError);
        // MinIO削除失敗してもデータベース削除は成功とする
      }

      return reply.send({
        message: 'Gacha image deleted successfully',
        deletedImageId: imageId
      });

    } catch (error) {
      fastify.log.error(error);
      if (error.message === 'Gacha not found or access denied') {
        return reply.code(404).send({ error: 'Gacha not found' });
      }
      if (error.message === 'Image not found in this gacha') {
        return reply.code(404).send({ error: 'Image not found' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ガチャ画像の並び順変更
  fastify.put('/gachas/:id/images/order', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);
      if (isNaN(gachaId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID' });
      }

      const { imageOrders } = request.body;
      if (!Array.isArray(imageOrders)) {
        return reply.code(400).send({ error: 'imageOrders must be an array' });
      }

      // 入力値検証
      for (const item of imageOrders) {
        if (!item.id || !item.display_order || 
            !Number.isInteger(item.id) || !Number.isInteger(item.display_order) || 
            item.display_order < 1) {
          return reply.code(400).send({ 
            error: 'Each item must have valid id and display_order (positive integer)' 
          });
        }
      }

      const updatedImages = await Gacha.updateGachaImageOrder(gachaId, imageOrders, request.user.userId);

      return reply.send({
        message: 'Image order updated successfully',
        images: updatedImages.map(img => ({
          id: img.id,
          gachaId: img.gacha_id,
          imageUrl: img.image_url,
          displayOrder: img.display_order,
          isMain: img.is_main
        }))
      });

    } catch (error) {
      fastify.log.error(error);
      if (error.message === 'Gacha not found or access denied') {
        return reply.code(404).send({ error: 'Gacha not found' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // メイン画像設定
  fastify.patch('/gachas/:id/images/:imageId/main', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);
      const imageId = parseInt(request.params.imageId);
      
      if (isNaN(gachaId) || isNaN(imageId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID or image ID' });
      }

      const updatedImage = await Gacha.setMainGachaImage(gachaId, imageId, request.user.userId);

      return reply.send({
        message: 'Main image updated successfully',
        image: {
          id: updatedImage.id,
          gachaId: updatedImage.gacha_id,
          imageUrl: updatedImage.image_url,
          isMain: updatedImage.is_main,
          displayOrder: updatedImage.display_order
        }
      });

    } catch (error) {
      fastify.log.error(error);
      if (error.message === 'Gacha not found or access denied') {
        return reply.code(404).send({ error: 'Gacha not found' });
      }
      if (error.message === 'Image not found in this gacha') {
        return reply.code(404).send({ error: 'Image not found' });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ガチャ画像のレスポンシブセット取得
  fastify.get('/gachas/:id/images/:imageId/responsive', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);
      const imageId = parseInt(request.params.imageId);
      
      if (isNaN(gachaId) || isNaN(imageId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID or image ID' });
      }

      // ガチャの所有者確認
      const gacha = await Gacha.findByIdForUser(gachaId, request.user.userId);
      if (!gacha) {
        return reply.code(404).send({ error: 'Gacha not found' });
      }

      // 画像情報とバリアントを取得
      const imageQuery = `
        SELECT 
          gi.id,
          gi.base_object_key,
          gi.original_filename,
          gi.processing_status,
          gi.display_order,
          gi.is_main,
          json_agg(
            json_build_object(
              'sizeType', iv.size_type,
              'formatType', iv.format_type,
              'objectKey', iv.object_key,
              'imageUrl', iv.image_url,
              'fileSize', iv.file_size,
              'width', iv.width,
              'height', iv.height,
              'quality', iv.quality
            ) ORDER BY iv.size_type, iv.format_type
          ) as variants
        FROM gacha_images gi
        LEFT JOIN image_variants iv ON gi.id = iv.gacha_image_id
        WHERE gi.id = $1 AND gi.gacha_id = $2
        GROUP BY gi.id, gi.base_object_key, gi.original_filename, gi.processing_status, gi.display_order, gi.is_main
      `;
      
      const result = await fastify.pg.query(imageQuery, [imageId, gachaId]);
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Image not found' });
      }
      
      const imageData = result.rows[0];
      
      // レスポンシブ画像セット生成
      const imageSet = generateResponsiveImageSet(imageData.base_object_key);
      
      return reply.send({
        success: true,
        image: {
          id: imageData.id,
          originalFilename: imageData.original_filename,
          processingStatus: imageData.processing_status,
          displayOrder: imageData.display_order,
          isMain: imageData.is_main
        },
        variants: imageData.variants.filter(v => v.sizeType !== null),
        imageSet,
        statistics: {
          totalVariants: imageData.variants.filter(v => v.sizeType !== null).length,
          expectedVariants: 12, // 4サイズ × 3フォーマット
          completionRate: Math.round((imageData.variants.filter(v => v.sizeType !== null).length / 12) * 100)
        }
      });
      
    } catch (error) {
      console.error('Get responsive image set error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get responsive image set',
        details: error.message
      });
    }
  });

  // 画像処理統計情報取得（管理者用）
  fastify.get('/processing/statistics', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const stats = await getProcessingStatistics(fastify.pg);
      
      // ユーザー固有の統計も取得
      const userStatsQuery = `
        SELECT 
          'user_gacha_images' as image_type,
          COUNT(*) FILTER (WHERE gi.processing_status = 'pending') as pending_count,
          COUNT(*) FILTER (WHERE gi.processing_status = 'processing') as processing_count,
          COUNT(*) FILTER (WHERE gi.processing_status = 'completed') as completed_count,
          COUNT(*) FILTER (WHERE gi.processing_status = 'failed') as failed_count,
          COUNT(*) as total_count,
          CASE 
            WHEN COUNT(*) > 0 THEN 
              ROUND(COUNT(*) FILTER (WHERE gi.processing_status = 'completed') * 100.0 / COUNT(*), 2)
            ELSE 0
          END as completion_rate
        FROM gacha_images gi
        JOIN gachas g ON gi.gacha_id = g.id
        WHERE g.user_id = $1
      `;
      
      const userStatsResult = await fastify.pg.query(userStatsQuery, [request.user.userId]);
      
      return reply.send({
        success: true,
        globalStatistics: stats,
        userStatistics: userStatsResult.rows[0]
      });
    } catch (error) {
      console.error('Get processing statistics error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get processing statistics',
        details: error.message
      });
    }
  });

  // 失敗した画像処理の再試行（ユーザー画像のみ）
  fastify.post('/processing/retry', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      // ユーザーのガチャに関連する失敗画像のみ再試行
      const retryQuery = `
        UPDATE gacha_images 
        SET processing_status = 'pending', updated_at = CURRENT_TIMESTAMP
        WHERE processing_status = 'failed' 
        AND gacha_id IN (SELECT id FROM gachas WHERE user_id = $1)
        RETURNING id, original_filename
      `;
      
      const result = await fastify.pg.query(retryQuery, [request.user.userId]);
      
      return reply.send({
        success: true,
        message: `${result.rows.length} images marked for retry`,
        retryList: result.rows.map(row => ({
          imageType: 'gacha_images',
          imageId: row.id,
          filename: row.original_filename
        }))
      });
    } catch (error) {
      console.error('Retry processing error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to retry processing',
        details: error.message
      });
    }
  });
}
