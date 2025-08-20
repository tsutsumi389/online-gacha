// ガチャモデル
import database from '../config/database.js';

class Gacha {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.rates = data.rates || 'N/A'; // ratesカラムがない場合のデフォルト値
    this.imageUrl = data.image_url || '/images/gacha-default.png'; // デフォルト画像
    this.isActive = data.is_active;
    this.startDate = data.start_date;
    this.endDate = data.end_date;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.creatorName = data.creator_name;
    this.totalItems = data.total_items;
    this.availableItems = data.available_items;
    this.items = data.items || [];
  }

  // JSONレスポンス用データ変換
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      rates: this.rates,
      imageUrl: this.imageUrl,
      isActive: this.isActive,
      startDate: this.startDate,
      endDate: this.endDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      creatorName: this.creatorName,
      totalItems: this.totalItems,
      availableItems: this.availableItems,
      items: this.items
    };
  }

  // アクティブなガチャ一覧を取得
  static async findActive() {
    const result = await database.query(`
      SELECT 
        g.id, g.name, g.description, g.price,
        g.is_public as is_active, g.display_from as start_date, g.display_to as end_date, g.created_at,
        u.name as creator_name,
        COUNT(gi.id) as total_items,
        COUNT(CASE WHEN gi.stock > 0 THEN 1 END) as available_items
      FROM gachas g
      LEFT JOIN users u ON g.user_id = u.id
      LEFT JOIN gacha_items gi ON g.id = gi.gacha_id
      WHERE g.is_public = true 
        AND g.display_from <= CURRENT_TIMESTAMP 
        AND (g.display_to IS NULL OR g.display_to >= CURRENT_TIMESTAMP)
      GROUP BY g.id, g.name, g.description, g.price, g.is_public, 
               g.display_from, g.display_to, g.created_at, u.name
      ORDER BY g.created_at DESC
    `);

    return result.rows.map(row => new Gacha(row));
  }

  // ガチャ詳細を取得（アイテム込み）
  static async findByIdWithItems(gachaId) {
    const gachaResult = await database.query(`
      SELECT 
        g.id, g.name, g.description, g.price,
        g.is_public as is_active, g.display_from as start_date, g.display_to as end_date, g.created_at,
        u.name as creator_name,
        COUNT(gi.id) as total_items,
        COUNT(CASE WHEN gi.stock > 0 THEN 1 END) as available_items
      FROM gachas g
      LEFT JOIN users u ON g.user_id = u.id
      LEFT JOIN gacha_items gi ON g.id = gi.gacha_id
      WHERE g.id = $1 AND g.is_public = true
      GROUP BY g.id, g.name, g.description, g.price, g.is_public, 
               g.display_from, g.display_to, g.created_at, u.name
    `, [gachaId]);

    if (gachaResult.rows.length === 0) {
      return null;
    }

    const itemsResult = await database.query(`
      SELECT id, name, description, rarity, stock, drop_rate
      FROM gacha_items
      WHERE gacha_id = $1 AND stock > 0
      ORDER BY rarity DESC, name
    `, [gachaId]);

    const gachaData = gachaResult.rows[0];
    gachaData.items = itemsResult.rows;

    return new Gacha(gachaData);
  }

  // ユーザー用のガチャ取得メソッド
  static async findAllForUser({ userId, search = '', offset = 0, limit = 10, sortBy = 'created_at', sortOrder = 'DESC' }) {
    const validSortColumns = ['id', 'name', 'price', 'created_at', 'display_from', 'display_to'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const finalSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    let whereClause = 'WHERE g.user_id = $1';
    let queryParams = [userId];
    
    if (search) {
      whereClause += ' AND (g.name ILIKE $2 OR g.description ILIKE $2)';
      queryParams.push(`%${search}%`);
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM gachas g
      ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        g.id, g.name, g.description, g.price,
        g.is_public, g.display_from, g.display_to, g.created_at, g.updated_at,
        u.name as creator_name,
        COUNT(gi.id) as total_items,
        COUNT(CASE WHEN gi.stock > 0 THEN 1 END) as available_items
      FROM gachas g
      LEFT JOIN users u ON g.user_id = u.id
      LEFT JOIN gacha_items gi ON g.id = gi.gacha_id
      ${whereClause}
      GROUP BY g.id, g.name, g.description, g.price, g.is_public, 
               g.display_from, g.display_to, g.created_at, g.updated_at, u.name
      ORDER BY g.${finalSortBy} ${finalSortOrder}
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    queryParams.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      database.query(countQuery, search ? queryParams.slice(0, 2) : [queryParams[0]]),
      database.query(dataQuery, queryParams)
    ]);

    return {
      gachas: dataResult.rows.map(row => new Gacha(row)),
      total: parseInt(countResult.rows[0].total),
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
    };
  }

  // ユーザー用のガチャ詳細取得
  static async findByIdForUser(gachaId, userId) {
    const gachaResult = await database.query(`
      SELECT 
        g.id, g.name, g.description, g.price,
        g.is_public, g.display_from, g.display_to, g.created_at, g.updated_at,
        u.name as creator_name,
        COUNT(gi.id) as total_items,
        COUNT(CASE WHEN gi.stock > 0 THEN 1 END) as available_items
      FROM gachas g
      LEFT JOIN users u ON g.user_id = u.id
      LEFT JOIN gacha_items gi ON g.id = gi.gacha_id
      WHERE g.id = $1 AND g.user_id = $2
      GROUP BY g.id, g.name, g.description, g.price, g.is_public, 
               g.display_from, g.display_to, g.created_at, g.updated_at, u.name
    `, [gachaId, userId]);

    if (gachaResult.rows.length === 0) {
      return null;
    }

    return new Gacha(gachaResult.rows[0]);
  }

  // ユーザー用のガチャ作成
  static async createForUser({ name, description, price, isPublic = true, displayFrom, displayTo, userId }) {
    // 空文字列をnullに変換
    const parsedDisplayFrom = displayFrom && displayFrom.trim() !== '' ? displayFrom : null;
    const parsedDisplayTo = displayTo && displayTo.trim() !== '' ? displayTo : null;
    
    const result = await database.query(`
      INSERT INTO gachas (name, description, price, is_public, display_from, display_to, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, description, price, is_public, display_from, display_to, created_at, user_id
    `, [name, description, price, isPublic, parsedDisplayFrom, parsedDisplayTo, userId]);

    const createdGacha = result.rows[0];
    
    // creator_nameを取得
    const userResult = await database.query('SELECT name FROM users WHERE id = $1', [userId]);
    createdGacha.creator_name = userResult.rows[0]?.name;
    createdGacha.total_items = 0;
    createdGacha.available_items = 0;

    return new Gacha(createdGacha);
  }

    // ユーザー用のガチャ更新
  static async updateByIdForUser(id, { name, description, price, isPublic, displayFrom, displayTo }, userId) {
    // 空文字列をnullに変換
    const parsedDisplayFrom = displayFrom && displayFrom.trim() !== '' ? displayFrom : null;
    const parsedDisplayTo = displayTo && displayTo.trim() !== '' ? displayTo : null;
    
    const result = await database.query(`
      UPDATE gachas 
      SET name = $1, description = $2, price = $3, is_public = $4, display_from = $5, display_to = $6
      WHERE id = $7 AND user_id = $8
      RETURNING id, name, description, price, is_public, display_from, display_to, created_at, user_id
    `, [name, description, price, isPublic, parsedDisplayFrom, parsedDisplayTo, id, userId]);

    return result.rows[0];
  }

  // ユーザー用のガチャ削除
  static async deleteByIdForUser(gachaId, userId) {
    // 関連するアイテムも削除
    await database.query('DELETE FROM gacha_items WHERE gacha_id = $1', [gachaId]);
    
    const result = await database.query(`
      DELETE FROM gachas 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [gachaId, userId]);

    return result.rows.length > 0;
  }

  // ユーザー用のガチャ詳細取得（アイテム付き）
  static async findByIdForUserWithItems(gachaId, userId) {
    const gachaResult = await database.query(`
      SELECT 
        g.id, g.name, g.description, g.price,
        g.is_public, g.display_from, g.display_to, g.created_at, g.updated_at,
        u.name as creator_name,
        COUNT(gi.id) as total_items,
        COUNT(CASE WHEN gi.stock > 0 THEN 1 END) as available_items
      FROM gachas g
      LEFT JOIN users u ON g.user_id = u.id
      LEFT JOIN gacha_items gi ON g.id = gi.gacha_id
      WHERE g.id = $1 AND g.user_id = $2
      GROUP BY g.id, g.name, g.description, g.price, g.is_public, 
               g.display_from, g.display_to, g.created_at, g.updated_at, u.name
    `, [gachaId, userId]);

    if (gachaResult.rows.length === 0) {
      return null;
    }

    const itemsResult = await database.query(`
      SELECT id, name, description, rarity, stock, image_url, is_public
      FROM gacha_items
      WHERE gacha_id = $1
      ORDER BY rarity DESC, name
    `, [gachaId]);

    const gachaData = gachaResult.rows[0];
    gachaData.items = itemsResult.rows;

    return new Gacha(gachaData);
  }

  // ガチャアイテム一覧取得
  static async getItemsForUser(gachaId, userId) {
    // ガチャの所有者チェック
    const ownerCheck = await database.query(`
      SELECT id FROM gachas WHERE id = $1 AND user_id = $2
    `, [gachaId, userId]);

    if (ownerCheck.rows.length === 0) {
      throw new Error('Gacha not found or access denied');
    }

    const result = await database.query(`
      SELECT id, name, description, rarity, stock, image_url, is_public, created_at, updated_at
      FROM gacha_items
      WHERE gacha_id = $1
      ORDER BY rarity DESC, name
    `, [gachaId]);

    return result.rows;
  }

  // ガチャアイテム作成
  static async createItemForUser(gachaId, itemData, userId) {
    // ガチャの所有者チェック
    const ownerCheck = await database.query(`
      SELECT id FROM gachas WHERE id = $1 AND user_id = $2
    `, [gachaId, userId]);

    if (ownerCheck.rows.length === 0) {
      throw new Error('Gacha not found or access denied');
    }

    const { name, description, rarity = 'common', stock = 0, imageUrl = '', isPublic = true } = itemData;

    const result = await database.query(`
      INSERT INTO gacha_items (gacha_id, name, description, rarity, stock, image_url, is_public)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, description, rarity, stock, image_url, is_public, created_at, updated_at
    `, [gachaId, name, description, rarity, stock, imageUrl, isPublic]);

    return result.rows[0];
  }

  // ガチャアイテム更新
  static async updateItemForUser(gachaId, itemId, itemData, userId) {
    // ガチャの所有者チェック
    const ownerCheck = await database.query(`
      SELECT id FROM gachas WHERE id = $1 AND user_id = $2
    `, [gachaId, userId]);

    if (ownerCheck.rows.length === 0) {
      throw new Error('Gacha not found or access denied');
    }

    const { name, description, rarity, stock, imageUrl, isPublic } = itemData;

    const result = await database.query(`
      UPDATE gacha_items 
      SET name = $1, description = $2, rarity = $3, stock = $4, 
          image_url = $5, is_public = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND gacha_id = $8
      RETURNING id, name, description, rarity, stock, image_url, is_public, created_at, updated_at
    `, [name, description, rarity, stock, imageUrl, isPublic, itemId, gachaId]);

    if (result.rows.length === 0) {
      throw new Error('Item not found');
    }

    return result.rows[0];
  }

  // ガチャアイテム削除
  static async deleteItemForUser(gachaId, itemId, userId) {
    // ガチャの所有者チェック
    const ownerCheck = await database.query(`
      SELECT id FROM gachas WHERE id = $1 AND user_id = $2
    `, [gachaId, userId]);

    if (ownerCheck.rows.length === 0) {
      throw new Error('Gacha not found or access denied');
    }

    const result = await database.query(`
      DELETE FROM gacha_items 
      WHERE id = $1 AND gacha_id = $2
      RETURNING id
    `, [itemId, gachaId]);

    return result.rows.length > 0;
  }
}

export default Gacha;