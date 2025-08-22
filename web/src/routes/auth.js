// 認証関連のルート
import User from '../models/User.js';
import { loginSchema, registerSchema, changePasswordSchema, updateProfileSchema } from '../schemas/validation.js';

export default async function authRoutes(fastify, options) {
  // ユーザー登録
  fastify.post('/register', async (request, reply) => {
    try {
      // バリデーション
      const { error, value } = registerSchema.validate(request.body);
      if (error) {
        return reply.code(400).send({ 
          error: 'Validation failed', 
          message: error.details[0].message 
        });
      }

      const { name, email, password } = value;

      // ユーザーの作成（roleパラメータを削除）
      const newUser = await User.create({ name, email, password });

      // JWTトークンの生成（roleを除去）
      const token = fastify.jwt.sign({ 
        userId: newUser.id, 
        email: newUser.email 
      });

      // HTTPOnly Cookieでトークンを設定
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7日間
      });

      return reply.code(201).send({
        message: 'User registered successfully',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      });

    } catch (error) {
      fastify.log.error(error);
      
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        return reply.code(409).send({ 
          error: 'EMAIL_ALREADY_EXISTS',
          message: 'このメールアドレスは既に使用されています'
        });
      }
      if (error.message === 'NAME_ALREADY_EXISTS') {
        return reply.code(409).send({ 
          error: 'NAME_ALREADY_EXISTS',
          message: 'このユーザー名は既に使用されています'
        });
      }
      
      return reply.code(500).send({ 
        error: 'INTERNAL_SERVER_ERROR',
        message: '登録中にエラーが発生しました。もう一度お試しください' 
      });
    }
  });

  // ユーザーログイン
  fastify.post('/login', async (request, reply) => {
    try {
      // バリデーション
      const { error, value } = loginSchema.validate(request.body);
      if (error) {
        return reply.code(400).send({ 
          error: 'Validation failed', 
          details: error.details[0].message 
        });
      }

      const { email, password } = value;

      // ユーザー認証
      const user = await User.verifyPassword(email, password);
      if (!user) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      // JWTトークンの生成（roleを除去）
      const token = fastify.jwt.sign({ 
        userId: user.id, 
        email: user.email 
      });

      // HTTPOnly Cookieでトークンを設定
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
        path: '/' // 全パスでクッキーを有効にする
      });

      return reply.send({
        message: 'Login successful',
        user: user.toJSON()
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ユーザーログアウト
  fastify.post('/logout', async (request, reply) => {
    try {
      // Cookieをクリア
      reply.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/' // パスを明示的に指定
      });

      return reply.send({ message: 'Logout successful' });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // 現在のユーザー情報を取得
  fastify.get('/me', { 
    preHandler: fastify.authenticate 
  }, async (request, reply) => {
    try {
      const user = await User.findById(request.user.userId);
      
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return reply.send({
        user: user.toJSON()
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // トークンの検証
  fastify.get('/verify', async (request, reply) => {
    try {
      // Cookieからトークンを取得
      const token = request.cookies.token;
      
      if (!token) {
        return reply.code(401).send({ error: 'No token provided' });
      }

      // トークンの検証
      const decoded = fastify.jwt.verify(token);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return reply.code(401).send({ error: 'Invalid token' });
      }

      return reply.send({
        valid: true,
        user: user.toJSON()
      });

    } catch (error) {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  });

  // パスワード変更
  fastify.put('/change-password', { 
    preHandler: fastify.authenticate 
  }, async (request, reply) => {
    try {
      const { error, value } = changePasswordSchema.validate(request.body);
      if (error) {
        return reply.code(400).send({ 
          error: 'Validation failed', 
          details: error.details[0].message 
        });
      }

      const { currentPassword, newPassword } = value;

      const user = await User.findById(request.user.userId);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      await user.changePassword(currentPassword, newPassword);

      return reply.send({ message: 'Password changed successfully' });

    } catch (error) {
      fastify.log.error(error);
      
      if (error.message === 'Current password is incorrect') {
        return reply.code(401).send({ error: 'Current password is incorrect' });
      }
      
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // プロフィール統合更新
  fastify.put('/profile', { 
    preHandler: fastify.authenticate 
  }, async (request, reply) => {
    try {
      // バリデーション
      const { error, value } = updateProfileSchema.validate(request.body);
      if (error) {
        return reply.code(400).send({ 
          error: 'VALIDATION_ERROR', 
          message: '入力内容にエラーがあります',
          details: error.details.reduce((acc, detail) => {
            acc[detail.path[0]] = detail.message;
            return acc;
          }, {})
        });
      }

      const { name, email, currentPassword, newPassword } = value;
      
      // パスワード変更時の追加バリデーション
      if (newPassword && !currentPassword) {
        return reply.code(400).send({ 
          error: 'VALIDATION_ERROR', 
          message: '入力内容にエラーがあります',
          details: { currentPassword: 'パスワード変更時は現在のパスワードが必要です' }
        });
      }
      
      if (currentPassword && !newPassword) {
        return reply.code(400).send({ 
          error: 'VALIDATION_ERROR', 
          message: '入力内容にエラーがあります',
          details: { newPassword: '新しいパスワードは必須です' }
        });
      }

      const user = await User.findById(request.user.userId);
      
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const changedFields = [];
      const updates = {};

      // ユーザー名の更新
      if (name && name !== user.name) {
        await user.updateName(name);
        updates.name = name;
        changedFields.push('name');
      }

      // メールアドレスの更新
      if (email && email !== user.email) {
        await user.updateEmail(email);
        updates.email = email;
        changedFields.push('email');
      }

      // パスワードの更新
      if (currentPassword && newPassword) {
        await user.changePassword(currentPassword, newPassword);
        changedFields.push('password');
      }

      // 何も変更されていない場合
      if (changedFields.length === 0) {
        return reply.code(400).send({
          error: 'NO_CHANGES',
          message: '変更する項目がありません'
        });
      }

      // 更新されたユーザー情報を取得
      const updatedUser = await User.findById(request.user.userId);

      return reply.send({
        message: 'プロフィールが正常に更新されました',
        user: updatedUser.toJSON(),
        changedFields
      });

    } catch (error) {
      fastify.log.error(error);
      
      if (error.message === 'NAME_ALREADY_EXISTS') {
        return reply.code(409).send({ 
          error: 'VALIDATION_ERROR',
          message: '入力内容にエラーがあります',
          details: { name: 'このユーザー名は既に使用されています' }
        });
      }
      
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        return reply.code(409).send({ 
          error: 'VALIDATION_ERROR',
          message: '入力内容にエラーがあります',
          details: { email: 'このメールアドレスは既に使用されています' }
        });
      }
      
      if (error.message === 'Current password is incorrect') {
        return reply.code(401).send({ 
          error: 'VALIDATION_ERROR',
          message: '入力内容にエラーがあります',
          details: { currentPassword: '現在のパスワードが正しくありません' }
        });
      }
      
      return reply.code(500).send({ 
        error: 'INTERNAL_SERVER_ERROR',
        message: 'サーバーエラーが発生しました' 
      });
    }
  });
}
