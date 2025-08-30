import EventEmitter from 'events';
import cacheManager from './cacheManager.js';

class RealtimeUpdatesManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map(); // connectionId -> { response, userId, channels }
    this.channels = new Map(); // channelName -> Set<connectionId>
    this.connectionCounter = 0;
    
    // 定期的に死んでいるコネクションをクリーンアップ
    setInterval(() => {
      this.cleanupDeadConnections();
    }, 60000); // 1分ごと
  }

  /**
   * SSE接続を追加
   * @param {Object} response - Fastifyのレスポンスオブジェクト
   * @param {number} userId - ユーザーID
   * @param {Array} channels - 購読するチャンネル名の配列
   * @returns {string} connectionId
   */
  addConnection(response, userId, channels = ['global']) {
    const connectionId = `conn_${++this.connectionCounter}_${Date.now()}`;
    
    // SSEヘッダーを設定
    response.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // 接続を保存
    this.connections.set(connectionId, {
      response,
      userId,
      channels: new Set(channels),
      lastPing: Date.now()
    });

    // チャンネルに登録
    channels.forEach(channel => {
      if (!this.channels.has(channel)) {
        this.channels.set(channel, new Set());
      }
      this.channels.get(channel).add(connectionId);
    });

    // 接続確認メッセージを送信
    this.sendToConnection(connectionId, {
      type: 'connection',
      data: { 
        connectionId, 
        timestamp: new Date().toISOString(),
        message: 'Connected to real-time updates'
      }
    });

    // 定期的なpingを送信
    const pingInterval = setInterval(() => {
      if (this.connections.has(connectionId)) {
        this.sendPing(connectionId);
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // 30秒ごと

    // 接続終了時のクリーンアップ
    response.raw.on('close', () => {
      this.removeConnection(connectionId);
      clearInterval(pingInterval);
    });

    console.log(`SSE connection established: ${connectionId} for user ${userId}`);
    return connectionId;
  }

  /**
   * 接続を削除
   * @param {string} connectionId 
   */
  removeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // チャンネルから削除
      connection.channels.forEach(channel => {
        const channelConnections = this.channels.get(channel);
        if (channelConnections) {
          channelConnections.delete(connectionId);
          if (channelConnections.size === 0) {
            this.channels.delete(channel);
          }
        }
      });

      this.connections.delete(connectionId);
      console.log(`SSE connection closed: ${connectionId}`);
    }
  }

  /**
   * 特定のコネクションにメッセージを送信
   * @param {string} connectionId 
   * @param {Object} data 
   */
  sendToConnection(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (connection && !connection.response.raw.destroyed) {
      try {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        connection.response.raw.write(message);
        connection.lastPing = Date.now();
        return true;
      } catch (error) {
        console.warn(`Failed to send message to connection ${connectionId}:`, error.message);
        this.removeConnection(connectionId);
        return false;
      }
    }
    return false;
  }

  /**
   * チャンネルにメッセージをブロードキャスト
   * @param {string} channelName 
   * @param {Object} data 
   */
  broadcastToChannel(channelName, data) {
    const channelConnections = this.channels.get(channelName);
    if (!channelConnections) return 0;

    let successCount = 0;
    for (const connectionId of channelConnections) {
      if (this.sendToConnection(connectionId, data)) {
        successCount++;
      }
    }

    console.log(`Broadcasted to channel ${channelName}: ${successCount} connections`);
    return successCount;
  }

  /**
   * 全接続にメッセージをブロードキャスト
   * @param {Object} data 
   */
  broadcastToAll(data) {
    let successCount = 0;
    for (const connectionId of this.connections.keys()) {
      if (this.sendToConnection(connectionId, data)) {
        successCount++;
      }
    }

    console.log(`Broadcasted to all: ${successCount} connections`);
    return successCount;
  }

  /**
   * ping信号を送信
   * @param {string} connectionId 
   */
  sendPing(connectionId) {
    return this.sendToConnection(connectionId, {
      type: 'ping',
      data: { timestamp: new Date().toISOString() }
    });
  }

  /**
   * 死んでいるコネクションをクリーンアップ
   */
  cleanupDeadConnections() {
    const now = Date.now();
    const timeout = 2 * 60 * 1000; // 2分

    for (const [connectionId, connection] of this.connections.entries()) {
      if (now - connection.lastPing > timeout || connection.response.raw.destroyed) {
        this.removeConnection(connectionId);
      }
    }
  }

  /**
   * アクティブな接続数を取得
   */
  getConnectionCount() {
    return {
      total: this.connections.size,
      channels: Object.fromEntries(
        Array.from(this.channels.entries()).map(([name, conns]) => [name, conns.size])
      )
    };
  }

  /**
   * ガチャ関連のリアルタイム更新を送信
   */
  async sendGachaUpdate(gachaId, updateType, data) {
    const channelName = `gacha_${gachaId}`;
    
    // キャッシュを更新
    await cacheManager.delete(`*gacha_stats_${gachaId}*`);
    
    // リアルタイム更新を送信
    const updateData = {
      type: 'gacha_update',
      data: {
        gacha_id: gachaId,
        update_type: updateType, // 'draw', 'stats', 'new_item'
        timestamp: new Date().toISOString(),
        ...data
      }
    };

    // 特定のガチャチャンネルにブロードキャスト
    this.broadcastToChannel(channelName, updateData);
    
    // ダッシュボード用のグローバル更新
    if (['draw', 'stats'].includes(updateType)) {
      this.broadcastToChannel('dashboard', {
        type: 'dashboard_update',
        data: {
          gacha_id: gachaId,
          update_type: updateType,
          timestamp: new Date().toISOString(),
          ...data
        }
      });
    }
  }

  /**
   * ダッシュボード統計の更新を送信
   */
  async sendDashboardUpdate(statsData) {
    // キャッシュを更新
    await cacheManager.delete('dashboard_stats');
    
    const updateData = {
      type: 'dashboard_stats',
      data: {
        timestamp: new Date().toISOString(),
        stats: statsData
      }
    };

    this.broadcastToChannel('dashboard', updateData);
  }

  /**
   * ユーザー行動のリアルタイム通知
   */
  async sendUserActivityUpdate(userId, activity, gachaId = null) {
    const channelName = gachaId ? `gacha_${gachaId}` : 'global';
    
    const updateData = {
      type: 'user_activity',
      data: {
        user_id: userId,
        activity_type: activity.type, // 'draw', 'view', 'favorite'
        gacha_id: gachaId,
        timestamp: new Date().toISOString(),
        ...activity.data
      }
    };

    this.broadcastToChannel(channelName, updateData);
    
    // アクティブユーザー数の更新も送信
    if (activity.type === 'draw') {
      this.broadcastToChannel('dashboard', {
        type: 'active_users_update',
        data: {
          timestamp: new Date().toISOString(),
          active_connections: this.getConnectionCount().total
        }
      });
    }
  }
}

// シングルトンインスタンス
const realtimeUpdates = new RealtimeUpdatesManager();

export default realtimeUpdates;