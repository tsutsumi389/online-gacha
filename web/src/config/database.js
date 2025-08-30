// データベース接続設定
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

// データベース設定を読み込み
const dbConfig = JSON.parse(fs.readFileSync('database.json', 'utf8'));

class Database {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect() {
    if (!this.connected) {
      this.client = new Client(dbConfig);
      await this.client.connect();
      this.connected = true;
      console.log('Database connected successfully');
    }
    return this.client;
  }

  async query(text, params = []) {
    if (!this.connected) {
      await this.connect();
    }
    return this.client.query(text, params);
  }

  async getClient() {
    if (!this.connected) {
      await this.connect();
    }
    return this.client;
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
