// ユーザーガチャ管理ルート（全ユーザー用）
import Gacha from '../models/Gacha.js';
import database from '../config/database.js';
import { createGachaSchema, updateGachaSchema, createGachaItemSchema, updateGachaItemSchema } from '../schemas/validation.js';
import { uploadFile, generateGachaImageObjectKey, validateFile, deleteFile } from '../utils/minio.js';

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

      return reply.send({
        images: images.map(img => ({
          id: img.id,
          gachaId: img.gacha_id,
          imageUrl: img.image_url,
          objectKey: img.object_key,
          filename: img.filename,
          size: img.size,
          mimeType: img.mime_type,
          displayOrder: img.display_order,
          isMain: img.is_main,
          createdAt: img.created_at,
          updatedAt: img.updated_at
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

  // ガチャ画像アップロード
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

      // ファイル形式チェック
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.code(400).send({ 
          error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' 
        });
      }

      // ファイルサイズチェック（5MB制限）
      const maxSize = 5 * 1024 * 1024; // 5MB
      const buffer = await data.toBuffer();
      if (buffer.length > maxSize) {
        return reply.code(400).send({ 
          error: 'File too large. Maximum size is 5MB.' 
        });
      }

      // ガチャの所有者確認
      const gacha = await Gacha.findByIdForUser(gachaId, request.user.userId);
      if (!gacha) {
        return reply.code(404).send({ error: 'Gacha not found' });
      }

      // MinIOにアップロード（メタデータなし）
      const objectKey = generateGachaImageObjectKey(request.user.userId, gachaId, data.filename);

      await uploadFile(objectKey, buffer, data.mimetype);

      // 画像URLを生成
      const minioHost = process.env.MINIO_PUBLIC_ENDPOINT || 'localhost';
      const minioPort = process.env.MINIO_PORT || '9000';
      const imageUrl = `http://${minioHost}:${minioPort}/gacha-images/${objectKey}`;

      // ガチャ画像テーブルに追加
      const imageData = {
        image_url: imageUrl,
        object_key: objectKey,
        filename: data.filename,
        size: buffer.length,
        mime_type: data.mimetype
      };

      const gachaImage = await Gacha.addGachaImage(gachaId, imageData, request.user.userId);

      return reply.send({
        success: true,
        image: {
          id: gachaImage.id,
          gachaId: gachaImage.gacha_id,
          imageUrl: gachaImage.image_url,
          objectKey: gachaImage.object_key,
          filename: gachaImage.filename,
          size: gachaImage.size,
          mimeType: gachaImage.mime_type,
          displayOrder: gachaImage.display_order,
          isMain: gachaImage.is_main,
          createdAt: gachaImage.created_at
        }
      });

    } catch (error) {
      fastify.log.error(error);
      if (error.message === 'Gacha not found or access denied') {
        return reply.code(404).send({ error: 'Gacha not found' });
      }
      return reply.code(500).send({ error: 'Failed to upload image: ' + error.message });
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
}
