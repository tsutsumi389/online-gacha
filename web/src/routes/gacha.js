// ガチャ関連のルート
import Gacha from '../models/Gacha.js';
import { gachaDrawSchema, gachaListQuerySchema } from '../schemas/validation.js';
import database from '../config/database.js';

export default async function gachaRoutes(fastify, options) {
  // ガチャ一覧取得（検索・フィルタリング・ソート・ページネーション対応）
  fastify.get('/', async (request, reply) => {
    try {
      // デバッグ用：クエリパラメータをログ出力
      fastify.log.info('Received query parameters:', request.query);
      
      // クエリパラメータのバリデーション
      const { error, value } = gachaListQuerySchema.validate(request.query);
      if (error) {
        fastify.log.error('Validation error:', error.details);
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.details[0].message
        });
      }

      fastify.log.info('Validated parameters:', value);

      const {
        search,
        sortBy,
        sortOrder,
        page,
        limit
      } = value;

      // ガチャデータを取得
      const gachas = await Gacha.findActiveWithFilters({
        search,
        sortBy,
        sortOrder,
        page,
        limit
      });

      return reply.send({
        gachas,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(gachas.length / limit), // 実際の実装では総数も取得する必要があります
          totalItems: gachas.length,
          itemsPerPage: limit,
          hasNext: gachas.length === limit,
          hasPrev: page > 1
        }
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // カテゴリ一覧取得（現在のテーブル構造では空配列を返す）
  fastify.get('/categories', async (request, reply) => {
    try {
      // categoryカラムがないため、空の配列を返す
      const categories = await Gacha.getCategories();
      return reply.send({ categories });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // 人気ガチャランキング取得
  fastify.get('/popular', async (request, reply) => {
    try {
      const { limit = 5 } = request.query;
      const limitNum = Math.max(1, Math.min(20, parseInt(limit)));

      const gachas = await Gacha.getPopular(limitNum);
      return reply.send({ gachas });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ガチャ統計情報取得
  fastify.get('/stats', async (request, reply) => {
    try {
      const stats = await Gacha.getStats();
      
      return reply.send({
        totalGachas: parseInt(stats.total_gachas || 0),
        totalPlays: parseInt(stats.total_plays || 0),
        uniquePlayers: parseInt(stats.unique_players || 0)
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ガチャ詳細取得
  fastify.get('/:id', async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);

      if (isNaN(gachaId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID' });
      }

      const gacha = await Gacha.findByIdWithItems(gachaId);

      if (!gacha) {
        return reply.code(404).send({ error: 'Gacha not found' });
      }

      return reply.send({ gacha });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ガチャ実行
  fastify.post('/:id/draw', { 
    preHandler: fastify.authenticate 
  }, async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);

      if (isNaN(gachaId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID' });
      }

      const result = await Gacha.draw(gachaId, request.user.id);

      return reply.send({
        message: 'Gacha draw successful',
        ...result
      });

    } catch (error) {
      fastify.log.error(error);
      
      if (error.message === 'Gacha not found or not public') {
        return reply.code(404).send({ error: 'Gacha not found or not public' });
      }
      if (error.message === 'No items available in this gacha') {
        return reply.code(400).send({ error: 'No items available in this gacha' });
      }
      if (error.message === 'All items are out of stock') {
        return reply.code(400).send({ error: 'All items are out of stock' });
      }
      
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
