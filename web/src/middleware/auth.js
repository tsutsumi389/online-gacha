// 認証ミドルウェア
import User from '../models/User.js';

// JWT認証ミドルウェア
export const authenticate = (fastify) => {
  return async (request, reply) => {
    try {
      // Cookieからトークンを取得
      const token = request.cookies.token;
      
      if (!token) {
        return reply.code(401).send({ error: 'No token provided' });
      }

      // トークンの検証（roleフィールドなし）
      const decoded = fastify.jwt.verify(token);
      
      // ユーザーが実際に存在するか確認
      const user = await User.findById(decoded.userId);
      if (!user) {
        // ユーザーが存在しない場合はCookieをクリア
        reply.clearCookie('token');
        return reply.code(401).send({ error: 'User not found' });
      }
      
      // request.userに適切なフィールドを設定
      request.user = {
        id: decoded.userId,
        userId: decoded.userId,
        ...decoded
      };
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  };
};

// レート制限ミドルウェア（今後の実装用）
export const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: 'Too many requests from this IP, please try again later.'
};
