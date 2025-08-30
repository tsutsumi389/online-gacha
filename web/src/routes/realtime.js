import realtimeUpdates from '../utils/realtimeUpdates.js';
import Analytics from '../models/Analytics.js';

export default async function realtimeRoutes(fastify, options) {
  
  /**
   * SSEエンドポイント - リアルタイム更新の購読
   */
  fastify.get('/analytics/stream', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { channels = 'global' } = request.query;
      const channelList = channels.split(',').map(c => c.trim());
      
      // SSE接続を確立
      const connectionId = realtimeUpdates.addConnection(
        reply, 
        request.user.id, 
        channelList
      );

      // 初期データを送信
      if (channelList.includes('dashboard')) {
        try {
          const dashboardStats = await Analytics.getDashboardStats();
          realtimeUpdates.sendToConnection(connectionId, {
            type: 'initial_dashboard_data',
            data: dashboardStats
          });
        } catch (error) {
          console.warn('Failed to send initial dashboard data:', error.message);
        }
      }

      // 特定のガチャチャンネルがある場合
      const gachaChannels = channelList.filter(ch => ch.startsWith('gacha_'));
      for (const channel of gachaChannels) {
        const gachaId = parseInt(channel.replace('gacha_', ''));
        if (!isNaN(gachaId)) {
          try {
            const gachaStats = await Analytics.getGachaStatistics(gachaId);
            realtimeUpdates.sendToConnection(connectionId, {
              type: 'initial_gacha_data',
              data: { gacha_id: gachaId, stats: gachaStats }
            });
          } catch (error) {
            console.warn(`Failed to send initial data for gacha ${gachaId}:`, error.message);
          }
        }
      }

      // 接続を維持（レスポンスは終了しない）
      return reply;
      
    } catch (error) {
      console.error('SSE connection error:', error);
      return reply.status(500).send({ 
        error: 'リアルタイム接続の確立に失敗しました',
        details: error.message 
      });
    }
  });

  /**
   * 手動でリアルタイム更新をトリガー（管理者用）
   */
  fastify.post('/analytics/trigger-update', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { type, gacha_id, data } = request.body;

      switch (type) {
        case 'gacha_update':
          if (!gacha_id) {
            return reply.status(400).send({ error: 'gacha_idが必要です' });
          }
          await realtimeUpdates.sendGachaUpdate(gacha_id, 'manual_update', data || {});
          break;

        case 'dashboard_update':
          const dashboardStats = await Analytics.getDashboardStats();
          await realtimeUpdates.sendDashboardUpdate(dashboardStats);
          break;

        case 'cache_clear':
          await Analytics.clearCache(data?.pattern);
          realtimeUpdates.broadcastToAll({
            type: 'cache_cleared',
            data: { 
              pattern: data?.pattern,
              timestamp: new Date().toISOString()
            }
          });
          break;

        default:
          return reply.status(400).send({ error: '無効な更新タイプです' });
      }

      return { success: true, message: 'リアルタイム更新を送信しました' };
      
    } catch (error) {
      console.error('Manual update trigger error:', error);
      return reply.status(500).send({ 
        error: 'リアルタイム更新の送信に失敗しました',
        details: error.message 
      });
    }
  });

  /**
   * 接続状況の確認
   */
  fastify.get('/analytics/connections', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const connectionStats = realtimeUpdates.getConnectionCount();
      const cacheStats = await Analytics.getCacheStats();
      
      return {
        data: {
          connections: connectionStats,
          cache: cacheStats,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Connection stats error:', error);
      return reply.status(500).send({ 
        error: '接続状況の取得に失敗しました',
        details: error.message 
      });
    }
  });

  /**
   * リアルタイム更新のテスト送信
   */
  fastify.post('/analytics/test-broadcast', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { channel = 'global', message = 'Test message' } = request.body;
      
      const count = realtimeUpdates.broadcastToChannel(channel, {
        type: 'test_message',
        data: {
          message,
          timestamp: new Date().toISOString(),
          sender: request.user.username || `User ${request.user.id}`
        }
      });

      return { 
        success: true, 
        message: `${count}個の接続にテストメッセージを送信しました`,
        channel,
        connections: count
      };
      
    } catch (error) {
      console.error('Test broadcast error:', error);
      return reply.status(500).send({ 
        error: 'テストブロードキャストに失敗しました',
        details: error.message 
      });
    }
  });
}