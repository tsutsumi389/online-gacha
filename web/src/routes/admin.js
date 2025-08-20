// ユーザーガチャ管理ルート（全ユーザー用）
import Gacha from '../models/Gacha.js';
import { createGachaSchema, updateGachaSchema, createGachaItemSchema, updateGachaItemSchema } from '../schemas/validation.js';

export default async function userGachaRoutes(fastify, options) {
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
        gachas: result.gachas.map(gacha => gacha.toJSON()),
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
      const updatedGacha = await Gacha.updateByIdForUser(gachaId, request.user.userId, value);

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

      // ガチャとアイテムの詳細取得
      const gacha = await Gacha.findByIdForUserWithItems(gachaId, request.user.userId);
      if (!gacha) {
        return reply.code(404).send({ error: 'Gacha not found or access denied' });
      }

      return reply.send(gacha.toJSON());

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

  // ガチャアイテム作成
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

      // アイテム作成
      const newItem = await Gacha.createItemForUser(gachaId, value, request.user.userId);

      return reply.code(201).send({
        message: 'Gacha item created successfully',
        item: newItem
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ガチャアイテム更新
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

  // ガチャアイテム削除
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

      // アイテム削除
      await Gacha.deleteItemForUser(gachaId, itemId, request.user.userId);

      return reply.send({
        message: 'Gacha item deleted successfully',
        deletedItemId: itemId
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
