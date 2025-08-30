import config from '../config/index.js';

class CacheManager {
  constructor() {
    this.redis = null;
    this.fallbackCache = new Map();
    this.fallbackExpiry = new Map();
    this.isRedisAvailable = false;
    
    this.init();
  }

  /**
   * キャッシュシステムを初期化
   */
  async init() {
    try {
      // Redisを動的にインポート
      let Redis = null;
      try {
        const redisModule = await import('ioredis');
        Redis = redisModule.default;
      } catch (importError) {
        console.warn('ioredis not available, using in-memory cache only:', importError.message);
        return;
      }

      // Redis設定の確認
      if (Redis && config.redis && config.redis.host) {
        this.redis = new Redis({
          host: config.redis.host || 'localhost',
          port: config.redis.port || 6379,
          password: config.redis.password,
          db: config.redis.db || 0,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });

        // Redis接続テスト
        await this.redis.ping();
        this.isRedisAvailable = true;
        console.log('Redis cache initialized successfully');
        
        // Redis接続エラーハンドリング
        this.redis.on('error', (error) => {
          console.warn('Redis connection error, falling back to memory cache:', error.message);
          this.isRedisAvailable = false;
        });

        this.redis.on('ready', () => {
          console.log('Redis connection restored');
          this.isRedisAvailable = true;
        });

      } else {
        console.log('Redis not configured, using in-memory cache only');
      }
    } catch (error) {
      console.warn('Redis initialization failed, using in-memory cache:', error.message);
      this.isRedisAvailable = false;
    }
  }

  /**
   * キーからキャッシュデータを取得
   * @param {string} key - キャッシュキー
   * @returns {any|null} キャッシュされたデータまたはnull
   */
  async get(key) {
    try {
      if (this.isRedisAvailable && this.redis) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        return this.getFromMemoryCache(key);
      }
    } catch (error) {
      console.warn(`Cache get error for key ${key}:`, error.message);
      return this.getFromMemoryCache(key);
    }
  }

  /**
   * キャッシュにデータを保存
   * @param {string} key - キャッシュキー
   * @param {any} value - 保存するデータ
   * @param {number} ttl - TTL（秒）
   */
  async set(key, value, ttl = 300) {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.setex(key, ttl, JSON.stringify(value));
      }
      // 常にメモリキャッシュにもバックアップとして保存
      this.setMemoryCache(key, value, ttl * 1000);
    } catch (error) {
      console.warn(`Cache set error for key ${key}:`, error.message);
      this.setMemoryCache(key, value, ttl * 1000);
    }
  }

  /**
   * 複数のキーをパターンで削除
   * @param {string} pattern - 削除パターン（例: "gacha_stats_*"）
   */
  async delete(pattern) {
    try {
      if (this.isRedisAvailable && this.redis) {
        if (pattern.includes('*')) {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } else {
          await this.redis.del(pattern);
        }
      }
      
      // メモリキャッシュからも削除
      this.deleteFromMemoryCache(pattern);
    } catch (error) {
      console.warn(`Cache delete error for pattern ${pattern}:`, error.message);
      this.deleteFromMemoryCache(pattern);
    }
  }

  /**
   * キャッシュを全クリア
   */
  async flush() {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.flushdb();
      }
      this.fallbackCache.clear();
      this.fallbackExpiry.clear();
    } catch (error) {
      console.warn('Cache flush error:', error.message);
      this.fallbackCache.clear();
      this.fallbackExpiry.clear();
    }
  }

  /**
   * メモリキャッシュから取得
   */
  getFromMemoryCache(key) {
    if (!this.fallbackCache.has(key)) return null;
    
    const expiry = this.fallbackExpiry.get(key);
    if (Date.now() > expiry) {
      this.fallbackCache.delete(key);
      this.fallbackExpiry.delete(key);
      return null;
    }
    
    return this.fallbackCache.get(key);
  }

  /**
   * メモリキャッシュに保存
   */
  setMemoryCache(key, value, ttl) {
    // メモリ使用量制限（1000エントリまで）
    if (this.fallbackCache.size >= 1000) {
      // 古いエントリを削除
      const oldestKey = this.fallbackCache.keys().next().value;
      this.fallbackCache.delete(oldestKey);
      this.fallbackExpiry.delete(oldestKey);
    }
    
    this.fallbackCache.set(key, value);
    this.fallbackExpiry.set(key, Date.now() + ttl);
  }

  /**
   * メモリキャッシュから削除
   */
  deleteFromMemoryCache(pattern) {
    if (pattern.includes('*')) {
      const prefix = pattern.replace('*', '');
      for (const key of this.fallbackCache.keys()) {
        if (key.startsWith(prefix)) {
          this.fallbackCache.delete(key);
          this.fallbackExpiry.delete(key);
        }
      }
    } else {
      this.fallbackCache.delete(pattern);
      this.fallbackExpiry.delete(pattern);
    }
  }

  /**
   * 統計用: キャッシュヒット率を取得
   */
  async getStats() {
    const stats = {
      redis_available: this.isRedisAvailable,
      memory_cache_size: this.fallbackCache.size,
      redis_info: null
    };

    try {
      if (this.isRedisAvailable && this.redis) {
        const info = await this.redis.info('memory');
        stats.redis_info = info;
      }
    } catch (error) {
      console.warn('Error getting Redis stats:', error.message);
    }

    return stats;
  }

  /**
   * 接続を閉じる
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// シングルトンインスタンス
const cacheManager = new CacheManager();

export default cacheManager;