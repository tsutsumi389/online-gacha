// メインサーバーファイル
import Fastify from 'fastify';
import database from './src/config/database.js';
import { authenticate } from './src/middleware/auth.js';
import { ensureBucketExists } from './src/utils/minio.js';
import authRoutes from './src/routes/auth.js';
import gachaRoutes from './src/routes/gacha.js';
import userGachaRoutes from './src/routes/admin.js';
import imageRoutes from './src/routes/images.js';
import { errorHandler, setupGracefulShutdown } from './src/utils/helpers.js';

const fastify = Fastify({ logger: true });

// プラグインの登録
await fastify.register(import('@fastify/jwt'), {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
});

await fastify.register(import('@fastify/cookie'), {
  secret: process.env.COOKIE_SECRET || 'your-super-secret-cookie-key-change-this-in-production',
  parseOptions: {}
});

await fastify.register(import('@fastify/cors'), {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
});

// データベース接続
await database.connect();

// MinIOバケットの初期化
try {
  await ensureBucketExists();
  fastify.log.info('MinIO bucket initialized successfully');
} catch (error) {
  fastify.log.error('Failed to initialize MinIO bucket:', error);
  process.exit(1);
}

// 認証ミドルウェアをfastifyインスタンスに追加
fastify.decorate('authenticate', authenticate(fastify));

// ルートの登録
fastify.get('/', async (request, reply) => {
  return { 
    hello: 'world', 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  };
});

// 認証関連のルート
fastify.register(authRoutes, { prefix: '/api/auth' });

// ガチャ関連のルート
fastify.register(gachaRoutes, { prefix: '/api/gachas' });

// ユーザーガチャ管理のルート（一般ユーザー用）
fastify.register(userGachaRoutes, { prefix: '/api/my' });

// 管理者用ガチャ管理のルート
fastify.register(userGachaRoutes, { prefix: '/api/admin' });

// 画像管理のルート
fastify.register(imageRoutes, { prefix: '/api/admin/images' });

// エラーハンドラーの設定
fastify.setErrorHandler(errorHandler(fastify));

// Graceful shutdown の設定
setupGracefulShutdown(fastify, database);

// サーバー起動
fastify.listen({ port: 8080, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`server listening on ${address}`);
});
