// ユーザーモデル
import bcrypt from 'bcrypt';
import database from '../config/database.js';

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username || data.name;
    this.email = data.email;
    this.role = data.role;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // ユーザーをIDで取得
  static async findById(userId) {
    const result = await database.query(
      'SELECT id, name as username, email, role, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  // ユーザーをメールアドレスで取得
  static async findByEmail(email) {
    const result = await database.query(
      'SELECT id, name as username, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  // ユーザーをユーザー名で取得
  static async findByUsername(username) {
    const result = await database.query(
      'SELECT id, name as username, email, role, created_at, updated_at FROM users WHERE name = $1',
      [username]
    );
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  // 新しいユーザーを作成
  static async create({ username, email, password, role = 'user' }) {
    // メールアドレスの重複チェック
    const existingEmail = await this.findByEmail(email);
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    // ユーザー名の重複チェック
    const existingUsername = await this.findByUsername(username);
    if (existingUsername) {
      throw new Error('Username already exists');
    }

    // パスワードのハッシュ化
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ユーザーの作成
    const result = await database.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name as username, email, role, created_at',
      [username, email, hashedPassword, role]
    );

    return new User(result.rows[0]);
  }

  // パスワードの検証
  static async verifyPassword(email, password) {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    return new User(user);
  }

  // パスワードの変更
  async changePassword(currentPassword, newPassword) {
    const userWithPassword = await User.findByEmail(this.email);
    
    // 現在のパスワードの検証
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password_hash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // 新しいパスワードのハッシュ化
    const saltRounds = 12;
    const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // パスワードの更新
    await database.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newHashedPassword, this.id]
    );

    return true;
  }

  // JSON形式での出力（password_hashを除外）
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export default User;
