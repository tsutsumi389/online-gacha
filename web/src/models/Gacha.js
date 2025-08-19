// ガチャモデル
import database from '../config/database.js';

class Gacha {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;  // JSONレスポンス用データ変換
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      rates: this.rates,
      imageUrl: this.imageUrl,
      isActive: this.isActive,
      isPublic: this.isActive, // isActiveをisPublicとしても使用
      startDate: this.startDate,
      endDate: this.endDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      creatorName: this.creatorName,
      totalItems: this.totalItems,
      availableItems: this.availableItems,
      items: this.items
    };
  }n = data.description;
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
        AND (g.display_from IS NULL OR g.display_from <= CURRENT_TIMESTAMP)
        AND (g.display_to IS NULL OR g.display_to >= CURRENT_TIMESTAMP)
      GROUP BY g.id, u.name
      ORDER BY g.created_at DESC
    `);

    return result.rows.map(row => new Gacha(row));
  }

  // ガチャをIDで取得（アイテム込み）
  static async findByIdWithItems(gachaId) {
    // ガチャ情報を取得
    const gachaResult = await database.query(`
      SELECT 
        g.id, g.name, g.description, g.price,
        g.is_public as is_active, g.display_from as start_date, g.display_to as end_date, g.created_at,
        u.name as creator_name
      FROM gachas g
      LEFT JOIN users u ON g.user_id = u.id
      WHERE g.id = $1
    `, [gachaId]);

    if (gachaResult.rows.length === 0) {
      return null;
    }

    // ガチャアイテムを取得
    const itemsResult = await database.query(`
      SELECT id, name, image_url, stock
      FROM gacha_items
      WHERE gacha_id = $1
      ORDER BY name
    `, [gachaId]);

    const gachaData = gachaResult.rows[0];
    gachaData.items = itemsResult.rows;

    return new Gacha(gachaData);
  }

  // ガチャを実行
  static async draw(gachaId, count = 1) {
    // ガチャの存在確認
    const gachaResult = await database.query(
      'SELECT id, name, price, is_public FROM gachas WHERE id = $1',
      [gachaId]
    );

    if (gachaResult.rows.length === 0) {
      throw new Error('Gacha not found');
    }

    const gacha = gachaResult.rows[0];

    if (!gacha.is_public) {
      throw new Error('Gacha is not active');
    }

    // 在庫があるアイテムを取得
    const availableItemsResult = await database.query(`
      SELECT id, name, image_url, stock
      FROM gacha_items
      WHERE gacha_id = $1 AND stock > 0
    `, [gachaId]);

    if (availableItemsResult.rows.length === 0) {
      throw new Error('No items available in this gacha');
    }

    const availableItems = availableItemsResult.rows;
    const results = [];

    // ガチャを指定回数実行
    for (let i = 0; i < count; i++) {
      if (availableItems.length === 0) break;

      // ランダムにアイテムを選択（簡易実装）
      const randomIndex = Math.floor(Math.random() * availableItems.length);
      const selectedItem = availableItems[randomIndex];

      // 在庫を減らす
      await database.query(
        'UPDATE gacha_items SET stock = stock - 1 WHERE id = $1',
        [selectedItem.id]
      );

      results.push({
        id: selectedItem.id,
        name: selectedItem.name,
        image: selectedItem.image_url,
        rarity: 'R' // デフォルト値
      });

      // 在庫が0になったアイテムをリストから削除
      selectedItem.stock -= 1;
      if (selectedItem.stock <= 0) {
        availableItems.splice(randomIndex, 1);
      }
    }

    return {
      results,
      totalCost: gacha.price * count,
      drawCount: results.length
    };
  }

  // JSON形式での出力
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

  // 全ユーザー用: 自分のガチャ一覧取得（検索・ページネーション対応）
  static async findAllForUser({ userId, search = '', offset = 0, limit = 10, sortBy = 'created_at', sortOrder = 'DESC' }) {
    // 検索条件の構築
    let whereClause = 'WHERE g.user_id = $1';
    let queryParams = [userId];
    let paramIndex = 2;

    if (search.trim()) {
      whereClause += ` AND g.name ILIKE $${paramIndex}`;
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // カウントクエリ
    const countQuery = `
      SELECT COUNT(*) as total
      FROM gachas g
      LEFT JOIN users u ON g.user_id = u.id
      ${whereClause}
    `;

    const countResult = await database.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].total);

    // データ取得クエリ
    const dataQuery = `
      SELECT 
        g.id, g.name, g.description, g.price,
        g.is_public as is_active, g.display_from as start_date, g.display_to as end_date, 
        g.created_at, g.updated_at,
        u.name as creator_name,
        COUNT(gi.id) as total_items,
        COUNT(CASE WHEN gi.stock > 0 THEN 1 END) as available_items
      FROM gachas g
      LEFT JOIN users u ON g.user_id = u.id
      LEFT JOIN gacha_items gi ON g.id = gi.gacha_id
      ${whereClause}
      GROUP BY g.id, u.name
      ORDER BY g.${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const dataResult = await database.query(dataQuery, queryParams);

    return {
      gachas: dataResult.rows.map(row => new Gacha(row)),
      totalCount
    };
  }

  // 全ユーザー用: 自分のガチャをIDで取得
  static async findByIdForUser(gachaId, userId) {
    const result = await database.query(`
      SELECT 
        g.id, g.name, g.description, g.price,
        g.is_public as is_active, g.display_from as start_date, g.display_to as end_date, 
        g.created_at, g.updated_at,
        u.name as creator_name,
        COUNT(gi.id) as total_items,
        COUNT(CASE WHEN gi.stock > 0 THEN 1 END) as available_items
      FROM gachas g
      LEFT JOIN users u ON g.user_id = u.id
      LEFT JOIN gacha_items gi ON g.id = gi.gacha_id
      WHERE g.id = $1 AND g.user_id = $2
      GROUP BY g.id, u.name
    `, [gachaId, userId]);

    return result.rows[0] ? new Gacha(result.rows[0]) : null;
  }

  // 全ユーザー用: ガチャ作成
  static async createForUser({ name, description, price, isPublic = true, displayFrom, displayTo, userId }) {
    const result = await database.query(`
      INSERT INTO gachas (name, description, price, is_public, display_from, display_to, user_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, name, description, price, is_public as is_active, display_from as start_date, display_to as end_date, created_at, updated_at
    `, [name, description, price, isPublic, displayFrom, displayTo, userId]);

    // 作成者名を追加で取得
    const userResult = await database.query('SELECT name FROM users WHERE id = $1', [userId]);
    const gachaData = result.rows[0];
    gachaData.creator_name = userResult.rows[0]?.name;
    gachaData.total_items = 0;
    gachaData.available_items = 0;

    return new Gacha(gachaData);
  }

  // 全ユーザー用: ガチャ更新
  static async updateByIdForUser(gachaId, updateData, userId) {
    const setClause = [];
    const queryParams = [];
    let paramIndex = 1;

    // 更新フィールドの動的構築
    const fieldMapping = {
      name: 'name',
      description: 'description',
      price: 'price',
      isPublic: 'is_public',
      displayFrom: 'display_from',
      displayTo: 'display_to'
    };

    Object.keys(updateData).forEach(key => {
      if (fieldMapping[key] !== undefined) {
        setClause.push(`${fieldMapping[key]} = $${paramIndex}`);
        queryParams.push(updateData[key]);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    queryParams.push(gachaId, userId);

    const query = `
      UPDATE gachas 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING id, name, description, price, is_public as is_active, display_from as start_date, display_to as end_date, created_at, updated_at
    `;

    const result = await database.query(query, queryParams);
    
    if (result.rows.length === 0) {
      throw new Error('Gacha not found or access denied');
    }

    // 作成者名と関連情報を追加で取得
    const gachaData = result.rows[0];
    const additionalResult = await database.query(`
      SELECT 
        u.name as creator_name,
        COUNT(gi.id) as total_items,
        COUNT(CASE WHEN gi.stock > 0 THEN 1 END) as available_items
      FROM gachas g
      LEFT JOIN users u ON g.user_id = u.id
      LEFT JOIN gacha_items gi ON g.id = gi.gacha_id
      WHERE g.id = $1
      GROUP BY u.name
    `, [gachaId]);

    if (additionalResult.rows[0]) {
      gachaData.creator_name = additionalResult.rows[0].creator_name;
      gachaData.total_items = additionalResult.rows[0].total_items;
      gachaData.available_items = additionalResult.rows[0].available_items;
    }

    return new Gacha(gachaData);
  }

  // 全ユーザー用: ガチャ削除（所有者のみ）
  static async deleteByIdForUser(gachaId, userId) {
    await database.query('BEGIN');
    
    try {
      // ユーザーの所有確認
      const ownerCheck = await database.query('SELECT id FROM gachas WHERE id = $1 AND user_id = $2', [gachaId, userId]);
      if (ownerCheck.rows.length === 0) {
        throw new Error('Gacha not found or access denied');
      }

      // 関連するガチャ結果を削除
      await database.query('DELETE FROM gacha_results WHERE gacha_id = $1', [gachaId]);
      
      // 関連するガチャアイテムを削除
      await database.query('DELETE FROM gacha_items WHERE gacha_id = $1', [gachaId]);
      
      // ガチャ本体を削除
      const result = await database.query('DELETE FROM gachas WHERE id = $1 AND user_id = $2 RETURNING id', [gachaId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Gacha not found or access denied');
      }

      await database.query('COMMIT');
      return result.rows[0];
      
    } catch (error) {
      await database.query('ROLLBACK');
      throw error;
    }
  }

  // 全ユーザー用: ガチャ公開状態切り替え（所有者のみ）
  static async togglePublicForUser(gachaId, userId) {
    const result = await database.query(`
      UPDATE gachas 
      SET is_public = NOT is_public, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING id, is_public
    `, [gachaId, userId]);

    if (result.rows.length === 0) {
      throw new Error('Gacha not found or access denied');
    }

    const gachaData = result.rows[0];
    
    return {
      id: gachaData.id,
      isPublic: gachaData.is_public
    };
  }
}

export default Gacha;
