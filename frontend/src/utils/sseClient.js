// SSE (Server-Sent Events) クライアント管理クラス
class SSEClient {
  constructor() {
    this.connections = new Map(); // Map<connectionId, EventSource>
    this.eventHandlers = new Map(); // Map<connectionId, Map<eventType, Set<handler>>>
  }

  // SSE接続を作成
  connect(connectionId, endpoint) {
    // 既存の接続があれば閉じる
    this.disconnect(connectionId);

    try {
      const eventSource = new EventSource(endpoint);
      this.connections.set(connectionId, eventSource);
      this.eventHandlers.set(connectionId, new Map());

      // 基本的なイベントリスナーを設定
      eventSource.onopen = (event) => {
        console.log(`SSE connected: ${connectionId}`, event);
        this.trigger(connectionId, 'open', event);
      };

      eventSource.onerror = (event) => {
        console.error(`SSE error: ${connectionId}`, event);
        this.trigger(connectionId, 'error', event);
        
        // 接続失敗時は自動的にクリーンアップ
        if (eventSource.readyState === EventSource.CLOSED) {
          this.disconnect(connectionId);
        }
      };

      // カスタムイベントリスナー
      eventSource.addEventListener('connected', (event) => {
        console.log(`SSE connected event: ${connectionId}`, event.data);
        this.trigger(connectionId, 'connected', JSON.parse(event.data));
      });

      eventSource.addEventListener('stock-update', (event) => {
        console.log(`SSE stock update: ${connectionId}`, event.data);
        this.trigger(connectionId, 'stock-update', JSON.parse(event.data));
      });

      eventSource.addEventListener('initial-stock', (event) => {
        console.log(`SSE initial stock: ${connectionId}`, event.data);
        this.trigger(connectionId, 'initial-stock', JSON.parse(event.data));
      });

      return eventSource;
    } catch (error) {
      console.error(`Failed to create SSE connection: ${connectionId}`, error);
      throw error;
    }
  }

  // SSE接続を切断
  disconnect(connectionId) {
    const eventSource = this.connections.get(connectionId);
    if (eventSource) {
      eventSource.close();
      this.connections.delete(connectionId);
      this.eventHandlers.delete(connectionId);
      console.log(`SSE disconnected: ${connectionId}`);
    }
  }

  // 全ての接続を切断
  disconnectAll() {
    for (const connectionId of this.connections.keys()) {
      this.disconnect(connectionId);
    }
  }

  // イベントハンドラーを追加
  on(connectionId, eventType, handler) {
    const connection = this.eventHandlers.get(connectionId);
    if (!connection) {
      console.warn(`Connection not found: ${connectionId}`);
      return;
    }

    if (!connection.has(eventType)) {
      connection.set(eventType, new Set());
    }

    connection.get(eventType).add(handler);
  }

  // イベントハンドラーを削除
  off(connectionId, eventType, handler) {
    const connection = this.eventHandlers.get(connectionId);
    if (connection && connection.has(eventType)) {
      connection.get(eventType).delete(handler);
    }
  }

  // イベントを発火
  trigger(connectionId, eventType, data) {
    const connection = this.eventHandlers.get(connectionId);
    if (connection && connection.has(eventType)) {
      connection.get(eventType).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in SSE event handler (${eventType}):`, error);
        }
      });
    }
  }

  // 接続状態を取得
  getConnectionState(connectionId) {
    const eventSource = this.connections.get(connectionId);
    if (!eventSource) return 'CLOSED';
    
    switch (eventSource.readyState) {
      case EventSource.CONNECTING:
        return 'CONNECTING';
      case EventSource.OPEN:
        return 'OPEN';
      case EventSource.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }

  // 統計情報を取得
  getStats() {
    return {
      totalConnections: this.connections.size,
      connections: Array.from(this.connections.keys()).map(connectionId => ({
        id: connectionId,
        state: this.getConnectionState(connectionId),
        eventHandlers: this.eventHandlers.get(connectionId)?.size || 0
      }))
    };
  }
}

// シングルトンインスタンス
const sseClient = new SSEClient();

// ブラウザのunloadイベントで全接続を閉じる
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    sseClient.disconnectAll();
  });
}

export default sseClient;
