import database from '../config/database.js';

class Gacha {
  // 公開されているアクティブなガチャ一覧を取得（検索・フィルタ・ソート・ページネーション付き）
  static async findActiveWithFilters(filters = {}) {
    try {
      const {
        search,
        sortBy = 'created_at',
        sortOrder = 'desc',
        page = 1,
        limit = 10
      } = filters;

      let query = `
        SELECT 
          g.id,
          g.name,
          g.description,
          g.price,
          g.is_public,
          g.created_at,
          g.updated_at,
          u.name as creator_name,
          COUNT(DISTINCT gi.id) as item_count,
          COUNT(DISTINCT gr.id) as play_count
        FROM gachas g
        LEFT JOIN users u ON g.user_id = u.id
        LEFT JOIN gacha_items gi ON g.id = gi.gacha_id
        LEFT JOIN gacha_results gr ON g.id = gr.gacha_id
        WHERE g.is_public = true
      `;

      const params = [];
      let paramCount = 0;

      // 検索条件を追加
      if (search) {
        paramCount++;
        query += ` AND (g.name ILIKE $${paramCount} OR g.description ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      query += ` GROUP BY g.id, u.name`;

      // ソート条件を追加
      const allowedSortColumns = ['created_at', 'name', 'price', 'play_count'];
      const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      query += ` ORDER BY ${sortColumn} ${order}`;

      // ページネーション
      const offset = (page - 1) * limit;
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error in findActiveWithFilters:', error);
      throw error;
    }
  }

  // カテゴリ一覧を取得（現在のテーブル構造ではカテゴリカラムがないため空の配列を返す）
  static async getCategories() {
    try {
      // テーブルにcategoryカラムがないため、空の配列を返す
      return [];
    } catch (error) {
      console.error('Error in getCategories:', error);
      throw error;
    }
  }

  // 人気のガチャを取得
  static async getPopular(limit = 5) {
    try {
      const query = `
        SELECT 
          g.id,
          g.name,
          g.description,
          g.price,
          g.created_at,
          u.name as creator_name,
          COUNT(gr.id) as play_count
        FROM gachas g
        LEFT JOIN users u ON g.user_id = u.id
        LEFT JOIN gacha_results gr ON g.id = gr.gacha_id
        WHERE g.is_public = true
        GROUP BY g.id, u.name
        ORDER BY play_count DESC
        LIMIT $1
      `;
      const result = await database.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Error in getPopular:', error);
      throw error;
    }
  }

  // 統計情報を取得
  static async getStats() {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT g.id) as total_gachas,
          COUNT(DISTINCT gr.id) as total_plays,
          COUNT(DISTINCT gr.user_id) as unique_players
        FROM gachas g
        LEFT JOIN gacha_results gr ON g.id = gr.gacha_id
        WHERE g.is_public = true
      `;
      const result = await database.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('Error in getStats:', error);
      throw error;
    }
  }

  // 特定のユーザーが作成したガチャ一覧を取得
  static async findAllForUser(userId, options = {}) {
    try {
      const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = options;
      const offset = (page - 1) * limit;

      const query = `
        SELECT 
          g.id,
          g.name,
          g.description,
          g.price,
          g.is_public,
          g.created_at,
          g.updated_at,
          COUNT(DISTINCT gi.id) as item_count,
          COUNT(DISTINCT gr.id) as play_count
        FROM gachas g
        LEFT JOIN gacha_items gi ON g.id = gi.gacha_id
        LEFT JOIN gacha_results gr ON g.id = gr.gacha_id
        WHERE g.user_id = $1
        GROUP BY g.id
        ORDER BY g.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM gachas
        WHERE user_id = $1
      `;

      const [gachasResult, countResult] = await Promise.all([
        database.query(query, [userId, limit, offset]),
        database.query(countQuery, [userId])
      ]);

      return {
        gachas: gachasResult.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(countResult.rows[0].total / limit)
        }
      };
    } catch (error) {
      console.error('Error in findAllForUser:', error);
      throw error;
    }
  }

  // IDでガチャを取得（アイテム情報も含む）
  static async findByIdWithItems(id) {
    try {
      const gachaQuery = `
        SELECT 
          g.*,
          u.name as creator_name
        FROM gachas g
        LEFT JOIN users u ON g.user_id = u.id
        WHERE g.id = $1
      `;

      const itemsQuery = `
        SELECT 
          id,
          name,
          description,
          image_url,
          stock
        FROM gacha_items
        WHERE gacha_id = $1
        ORDER BY name ASC
      `;

      const [gachaResult, itemsResult] = await Promise.all([
        database.query(gachaQuery, [id]),
        database.query(itemsQuery, [id])
      ]);

      if (gachaResult.rows.length === 0) {
        return null;
      }

      return {
        ...gachaResult.rows[0],
        items: itemsResult.rows
      };
    } catch (error) {
      console.error('Error in findByIdWithItems:', error);
      throw error;
    }
  }

  // 新しいガチャを作成
  static async create(gachaData, userId) {
    try {
      const query = `
        INSERT INTO gachas (name, description, price, user_id, is_public)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const values = [
        gachaData.name,
        gachaData.description,
        gachaData.price,
        userId,
        gachaData.is_public || false
      ];

      const result = await database.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  }

  // ガチャを更新
  static async update(id, gachaData, userId) {
    try {
      const query = `
        UPDATE gachas 
        SET name = $1, description = $2, price = $3, is_public = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5 AND user_id = $6
        RETURNING *
      `;

      const values = [
        gachaData.name,
        gachaData.description,
        gachaData.price,
        gachaData.is_public,
        id,
        userId
      ];

      const result = await database.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in update:', error);
      throw error;
    }
  }

  // ガチャを削除
  static async delete(id, userId) {
    try {
      // 関連するガチャ結果とアイテムも削除
      await database.query('DELETE FROM gacha_results WHERE gacha_id = $1', [id]);
      await database.query('DELETE FROM gacha_items WHERE gacha_id = $1', [id]);
      
      const result = await database.query(
        'DELETE FROM gachas WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in delete:', error);
      throw error;
    }
  }

  // ユーザーのガチャアイテム取得
  static async getItemsForUser(gachaId, userId) {
    try {
      // ガチャがユーザーのものかチェック
      const gachaCheck = await database.query(
        'SELECT id FROM gachas WHERE id = $1 AND user_id = $2',
        [gachaId, userId]
      );

      if (gachaCheck.rows.length === 0) {
        throw new Error('Gacha not found or access denied');
      }

      const query = `
        SELECT 
          id,
          name,
          description,
          image_url,
          stock,
          is_public,
          created_at,
          updated_at
        FROM gacha_items
        WHERE gacha_id = $1
        ORDER BY name ASC
      `;

      const result = await database.query(query, [gachaId]);
      return result.rows;
    } catch (error) {
      console.error('Error in getItemsForUser:', error);
      throw error;
    }
  }

  // ガチャアイテム作成
  static async createItemForUser(gachaId, itemData, userId) {
    try {
      // ガチャがユーザーのものかチェック
      const gachaCheck = await database.query(
        'SELECT id FROM gachas WHERE id = $1 AND user_id = $2',
        [gachaId, userId]
      );

      if (gachaCheck.rows.length === 0) {
        throw new Error('Gacha not found or access denied');
      }

      const query = `
        INSERT INTO gacha_items (gacha_id, name, description, image_url, stock, is_public)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        gachaId,
        itemData.name,
        itemData.description,
        itemData.image_url,
        itemData.stock,
        itemData.is_public || true
      ];

      const result = await database.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in createItemForUser:', error);
      throw error;
    }
  }

  // ガチャを実行
  static async draw(gachaId, userId) {
    try {
      // ガチャとアイテム情報を取得
      const gacha = await this.findByIdWithItems(gachaId);
      if (!gacha || !gacha.is_public) {
        throw new Error('Gacha not found or not public');
      }

      if (gacha.items.length === 0) {
        throw new Error('No items available in this gacha');
      }

      // 在庫のあるアイテムのみをフィルタ
      const availableItems = gacha.items.filter(item => 
        item.stock === null || item.stock > 0
      );

      if (availableItems.length === 0) {
        throw new Error('All items are out of stock');
      }

      // ランダムにアイテムを選択（均等確率）
      const randomIndex = Math.floor(Math.random() * availableItems.length);
      const selectedItem = availableItems[randomIndex];

      // ガチャ結果を記録
      const resultQuery = `
        INSERT INTO gacha_results (user_id, gacha_id, gacha_item_id)
        VALUES ($1, $2, $3)
        RETURNING *
      `;

      const result = await database.query(resultQuery, [userId, gachaId, selectedItem.id]);

      // 在庫を減らす（在庫管理がある場合）
      if (selectedItem.stock !== null) {
        await database.query(
          'UPDATE gacha_items SET stock = stock - 1 WHERE id = $1',
          [selectedItem.id]
        );
      }

      return {
        result: result.rows[0],
        item: selectedItem,
        gacha: {
          id: gacha.id,
          name: gacha.name,
          price: gacha.price
        }
      };
    } catch (error) {
      console.error('Error in draw:', error);
      throw error;
    }
  }
}

export default Gacha;
