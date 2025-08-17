// データベース接続設定
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

// データベース設定を読み込み
const dbConfig = JSON.parse(fs.readFileSync('database.json', 'utf8'));

class Database {
  constructor() {
    this.client = new Client(dbConfig);
    this.connected = false;
  }

  async connect() {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
      console.log('Database connected successfully');
    }
    return this.client;
  }

  async query(text, params = []) {
    const client = await this.connect();
    return client.query(text, params);
  }

  async close() {
    if (this.connected) {
      await this.client.end();
      this.connected = false;
      console.log('Database connection closed');
    }
  }
}

// シングルトンインスタンス
const database = new Database();

export default database;
