// ユーザーモデル
import bcrypt from 'bcrypt';
import database from '../config/database.js';

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name || data.username;
    this.email = data.email;
    this.avatar_image_id = data.avatar_image_id;
    this.avatar_image_url = data.avatar_image_url;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // ユーザーをIDで取得（アバター情報も含む）
  static async findById(userId) {
    const result = await database.query(`
      SELECT 
        u.id, 
        u.name as username, 
        u.email, 
        u.avatar_image_id,
        uav_256.image_url as avatar_image_url,
        u.created_at, 
        u.updated_at 
      FROM users u
      LEFT JOIN user_avatar_images uai ON u.avatar_image_id = uai.id
      LEFT JOIN user_avatar_variants uav_256 ON uai.id = uav_256.user_avatar_image_id AND uav_256.size_type = 'avatar_256'
      WHERE u.id = $1
    `, [userId]);
    
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  // ユーザーをメールアドレスで取得
  static async findByEmail(email) {
    const result = await database.query(
      'SELECT id, name as username, email, password_hash, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  // ユーザーを名前で取得
  static async findByName(name) {
    const result = await database.query(
      'SELECT id, name as username, email, created_at, updated_at FROM users WHERE name = $1',
      [name]
    );
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  // 新しいユーザーを作成
  static async create({ name, email, password }) {
    // メールアドレスの重複チェック
    const existingEmail = await this.findByEmail(email);
    if (existingEmail) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    // ユーザー名の重複チェック
    const existingName = await this.findByName(name);
    if (existingName) {
      throw new Error('NAME_ALREADY_EXISTS');
    }

    // パスワードのハッシュ化
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ユーザーの作成
    const result = await database.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name as username, email, created_at',
      [name, email, hashedPassword]
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

  // ユーザー名更新メソッド
  async updateName(newName) {
    // 同じ名前の場合は更新不要
    if (newName === this.name) {
      return;
    }

    // 重複チェック
    const existingUser = await User.findByName(newName);
    if (existingUser && existingUser.id !== this.id) {
      throw new Error('NAME_ALREADY_EXISTS');
    }

    // ユーザー名の更新
    await database.query(
      'UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newName, this.id]
    );

    this.name = newName;
    this.updatedAt = new Date();
  }

  // メールアドレス更新メソッド
  async updateEmail(newEmail) {
    // 同じメールアドレスの場合は更新不要
    if (newEmail === this.email) {
      return;
    }

    // 重複チェック
    const existingUser = await User.findByEmail(newEmail);
    if (existingUser && existingUser.id !== this.id) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    // メールアドレスの更新
    await database.query(
      'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newEmail, this.id]
    );

    this.email = newEmail;
    this.updatedAt = new Date();
  }

  // アバター画像ID更新メソッド
  async updateAvatarImageId(avatarImageId) {
    await database.query(
      'UPDATE users SET avatar_image_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [avatarImageId, this.id]
    );

    this.avatar_image_id = avatarImageId;
    this.updatedAt = new Date();

    // アバターURLも更新
    if (avatarImageId) {
      const result = await database.query(`
        SELECT uav.image_url 
        FROM user_avatar_variants uav 
        WHERE uav.user_avatar_image_id = $1 AND uav.size_type = 'avatar_256'
      `, [avatarImageId]);
      
      this.avatar_image_url = result.rows[0]?.image_url || null;
    } else {
      this.avatar_image_url = null;
    }
  }

  // JSON形式での出力（password_hashを除外、avatar情報を追加）
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      avatarImageId: this.avatar_image_id,
      avatar_url: this.avatar_image_url,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export default User;
