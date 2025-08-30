// ガチャ関連のルート
import Gacha from '../models/Gacha.js';
import { gachaDrawSchema, gachaListQuerySchema } from '../schemas/validation.js';
import database from '../config/database.js';
import sseManager from '../utils/sseManager.js';
import { v4 as uuidv4 } from 'uuid';

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
        filter,
        sortBy,
        sortOrder,
        page,
        limit
      } = value;

      // ガチャデータを取得
      const gachas = await Gacha.findActiveWithFilters({
        search,
        filter,
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

  // SSE: ガチャ在庫のリアルタイム配信
  fastify.get('/stock/stream', async (request, reply) => {
    try {
      const connectionId = uuidv4();
      
      // SSEクライアントとして登録
      sseManager.addClient(connectionId, reply);
      
      // 在庫更新チャンネルに購読
      sseManager.subscribeToChannel(connectionId, 'stock-updates');
      
      // 初期在庫データを送信
      const stockData = await Gacha.getAllStockInfo();
      sseManager.sendToClient(connectionId, 'initial-stock', {
        gachas: stockData.map(item => ({
          gachaId: item.gacha_id,
          currentStock: parseInt(item.current_stock || 0),
          initialStock: parseInt(item.initial_stock || 0)
        }))
      });

      // 接続を維持（fastifyが自動的に処理）
      return reply;
      
    } catch (error) {
      fastify.log.error('SSE connection error:', error);
      return reply.code(500).send({ error: 'SSE connection failed' });
    }
  });

  // SSE: 特定ガチャの在庫ストリーム
  fastify.get('/:id/stock/stream', async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);
      
      if (isNaN(gachaId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID' });
      }

      const connectionId = uuidv4();
      
      // SSEクライアントとして登録
      sseManager.addClient(connectionId, reply);
      
      // 特定ガチャの在庫更新チャンネルに購読
      sseManager.subscribeToChannel(connectionId, `gacha-${gachaId}-stock`);
      
      // 初期在庫データを送信
      const stockInfo = await Gacha.getStockInfo(gachaId);
      if (stockInfo) {
        sseManager.sendToClient(connectionId, 'stock-update', {
          gachaId: stockInfo.gacha_id,
          currentStock: parseInt(stockInfo.current_stock || 0),
          initialStock: parseInt(stockInfo.initial_stock || 0),
          gachaName: stockInfo.gacha_name
        });
      }

      // 接続を維持
      return reply;
      
    } catch (error) {
      fastify.log.error('SSE gacha stock connection error:', error);
      return reply.code(500).send({ error: 'SSE connection failed' });
    }
  });

  // SSE: ガチャ詳細画面用（アイテム個別在庫情報）
  fastify.get('/:id/detail/stream', async (request, reply) => {
    try {
      const gachaId = parseInt(request.params.id);
      
      if (isNaN(gachaId)) {
        return reply.code(400).send({ error: 'Invalid gacha ID' });
      }

      const connectionId = uuidv4();
      
      // SSEクライアントとして登録
      sseManager.addClient(connectionId, reply);
      
      // ガチャ詳細更新チャンネルに購読
      sseManager.subscribeToChannel(connectionId, `gacha-${gachaId}-detail`);
      
      // 初期データを送信（ガチャとアイテムの詳細情報）
      const gacha = await Gacha.findByIdWithItems(gachaId);
      if (gacha) {
        const totalStock = gacha.items.reduce((sum, item) => sum + parseInt(item.stock || 0), 0);
        const initialStock = gacha.items.reduce((sum, item) => sum + parseInt(item.initial_stock || 0), 0);
        
        sseManager.sendToClient(connectionId, 'gacha-detail-update', {
          gachaId: gacha.id,
          gachaName: gacha.name,
          totalStock,
          initialStock,
          items: gacha.items.map(item => ({
            id: item.id,
            name: item.name,
            stock: parseInt(item.stock || 0),
            initialStock: parseInt(item.initial_stock || 0)
          }))
        });
      }

      // 接続を維持
      return reply;
      
    } catch (error) {
      fastify.log.error('SSE gacha detail connection error:', error);
      return reply.code(500).send({ error: 'SSE connection failed' });
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

      // ガチャ実行後、在庫数をSSEでブロードキャスト
      const stockInfo = await Gacha.getStockInfo(gachaId);
      if (stockInfo) {
        // 全体の在庫更新チャンネルにブロードキャスト
        sseManager.broadcast('stock-updates', 'stock-update', {
          gachaId: stockInfo.gacha_id,
          currentStock: parseInt(stockInfo.current_stock || 0),
          initialStock: parseInt(stockInfo.initial_stock || 0)
        });

        // 特定ガチャの在庫更新チャンネルにブロードキャスト
        sseManager.broadcast(`gacha-${gachaId}-stock`, 'stock-update', {
          gachaId: stockInfo.gacha_id,
          currentStock: parseInt(stockInfo.current_stock || 0),
          initialStock: parseInt(stockInfo.initial_stock || 0),
          gachaName: stockInfo.gacha_name
        });
      }

      // ガチャ詳細画面用のSSE更新（アイテム個別在庫情報）
      const gachaDetail = await Gacha.findByIdWithItems(gachaId);
      if (gachaDetail) {
        const totalStock = gachaDetail.items.reduce((sum, item) => sum + parseInt(item.stock || 0), 0);
        const initialStock = gachaDetail.items.reduce((sum, item) => sum + parseInt(item.initial_stock || 0), 0);
        
        sseManager.broadcast(`gacha-${gachaId}-detail`, 'gacha-detail-update', {
          gachaId: gachaDetail.id,
          gachaName: gachaDetail.name,
          totalStock,
          initialStock,
          items: gachaDetail.items.map(item => ({
            id: item.id,
            name: item.name,
            stock: parseInt(item.stock || 0),
            initialStock: parseInt(item.initial_stock || 0)
          }))
        });
      }

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

  // ガチャ状況取得
  fastify.get('/:id/status', async (request, reply) => {
    const { id } = request.params;
    const { page = 1, limit = 10 } = request.query;

    try {
      // ガチャ情報を取得
      const gacha = await Gacha.findById(id);
      if (!gacha) {
        return reply.code(404).send({ error: 'ガチャが見つかりません' });
      }

      // 当選者リストを取得（ページネーション対応）
      const offset = (page - 1) * limit;
      const winners = await Gacha.getWinners(id, limit, offset);
      const totalWinners = await Gacha.countWinners(id);

      return reply.send({
        gacha,
        winners,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalWinners / limit),
          totalItems: totalWinners,
          itemsPerPage: limit,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
