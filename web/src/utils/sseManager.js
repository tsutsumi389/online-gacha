// SSE (Server-Sent Events) 管理クラス
class SSEManager {
  constructor() {
    this.clients = new Map(); // クライアント管理: Map<connectionId, { reply, channels }>
    this.channels = new Map(); // チャンネル管理: Map<channelName, Set<connectionId>>
  }

  // クライアントを登録
  addClient(connectionId, reply) {
    this.clients.set(connectionId, {
      reply,
      channels: new Set()
    });

    // 接続時の基本設定
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // 接続確認メッセージ
    this.sendToClient(connectionId, 'connected', { message: 'SSE connection established' });

    // クライアント切断時のクリーンアップ
    reply.raw.on('close', () => {
      this.removeClient(connectionId);
    });

    reply.raw.on('error', () => {
      this.removeClient(connectionId);
    });
  }

  // クライアントを削除
  removeClient(connectionId) {
    const client = this.clients.get(connectionId);
    if (client) {
      // チャンネルから削除
      client.channels.forEach(channel => {
        this.unsubscribeFromChannel(connectionId, channel);
      });
      
      this.clients.delete(connectionId);
    }
  }

  // チャンネルに購読
  subscribeToChannel(connectionId, channelName) {
    const client = this.clients.get(connectionId);
    if (!client) return;

    // チャンネルが存在しない場合は作成
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new Set());
    }

    // クライアントをチャンネルに追加
    this.channels.get(channelName).add(connectionId);
    client.channels.add(channelName);
  }

  // チャンネルから購読解除
  unsubscribeFromChannel(connectionId, channelName) {
    const client = this.clients.get(connectionId);
    if (client) {
      client.channels.delete(channelName);
    }

    const channel = this.channels.get(channelName);
    if (channel) {
      channel.delete(connectionId);
      // チャンネルが空になったら削除
      if (channel.size === 0) {
        this.channels.delete(channelName);
      }
    }
  }

  // 特定のクライアントにメッセージ送信
  sendToClient(connectionId, event, data) {
    const client = this.clients.get(connectionId);
    if (client && !client.reply.raw.destroyed) {
      try {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        client.reply.raw.write(message);
      } catch (error) {
        console.error('Error sending SSE message to client:', error);
        this.removeClient(connectionId);
      }
    }
  }

  // チャンネルの全クライアントにブロードキャスト
  broadcast(channelName, event, data) {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.forEach(connectionId => {
        this.sendToClient(connectionId, event, data);
      });
    }
  }

  // 全クライアントにブロードキャスト
  broadcastToAll(event, data) {
    this.clients.forEach((client, connectionId) => {
      this.sendToClient(connectionId, event, data);
    });
  }

  // 統計情報取得
  getStats() {
    return {
      totalClients: this.clients.size,
      totalChannels: this.channels.size,
      channels: Array.from(this.channels.keys()).map(channelName => ({
        name: channelName,
        clients: this.channels.get(channelName).size
      }))
    };
  }
}

// シングルトンインスタンス
const sseManager = new SSEManager();

export default sseManager;
