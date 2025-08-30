// 設定ファイル
const config = {
  // データベース設定
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'online_gacha_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },

  // Redis設定（オプション）
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    enabled: process.env.REDIS_ENABLED !== 'false' // デフォルトで有効
  },

  // JWT設定
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // Cookie設定
  cookie: {
    secret: process.env.COOKIE_SECRET || 'your-super-secret-cookie-key-change-this-in-production',
    maxAge: process.env.COOKIE_MAX_AGE || 7 * 24 * 60 * 60 * 1000 // 7日
  },

  // CORS設定
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  },

  // MinIO設定
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucketName: process.env.MINIO_BUCKET_NAME || 'gacha-images'
  },

  // サーバー設定
  server: {
    port: process.env.PORT || 8080,
    host: process.env.HOST || '0.0.0.0'
  },

  // 分析設定
  analytics: {
    // キャッシュのTTL（秒）
    cacheTTL: {
      stats: parseInt(process.env.ANALYTICS_STATS_TTL) || 5 * 60, // 5分
      dashboard: parseInt(process.env.ANALYTICS_DASHBOARD_TTL) || 10 * 60, // 10分
      demographics: parseInt(process.env.ANALYTICS_DEMOGRAPHICS_TTL) || 15 * 60, // 15分
      hourly: parseInt(process.env.ANALYTICS_HOURLY_TTL) || 30 * 60 // 30分
    },
    // バッチ処理設定
    batchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE) || 1000,
    // 統計更新間隔
    updateInterval: parseInt(process.env.ANALYTICS_UPDATE_INTERVAL) || 60 * 60 * 1000, // 1時間
    // リアルタイム更新の有効/無効
    realtimeEnabled: process.env.ANALYTICS_REALTIME_ENABLED !== 'false'
  },

  // A/Bテスト設定
  abTesting: {
    // デフォルトのテスト期間（日数）
    defaultTestDuration: parseInt(process.env.AB_TEST_DEFAULT_DURATION) || 14,
    // 最小サンプルサイズ
    minSampleSize: parseInt(process.env.AB_TEST_MIN_SAMPLE_SIZE) || 100,
    // 統計的有意性の閾値
    significanceThreshold: parseFloat(process.env.AB_TEST_SIGNIFICANCE_THRESHOLD) || 0.05
  },

  // 環境設定
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
};

export default config;