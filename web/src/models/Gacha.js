import database from '../config/database.js';

class Gacha {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.user_id = data.user_id;
    this.is_public = data.is_public;
    this.display_from = data.display_from;
    this.display_to = data.display_to;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      userId: this.user_id,
      isPublic: this.is_public,
      displayFrom: this.display_from,
      displayTo: this.display_to,
      createdAt: this.created_at,
      updatedAt: this.updated_at
    };
  }

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
          COUNT(DISTINCT gr.id) as play_count,
          main_img.base_object_key as main_image_base_key,
          main_img.original_filename as main_image_filename,
          main_img.processing_status as main_image_status
        FROM gachas g
        LEFT JOIN users u ON g.user_id = u.id
        LEFT JOIN gacha_items gi ON g.id = gi.gacha_id
        LEFT JOIN gacha_results gr ON g.id = gr.gacha_id
        LEFT JOIN gacha_images main_img ON g.id = main_img.gacha_id AND main_img.is_main = true
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

      query += ` GROUP BY g.id, u.name, main_img.base_object_key, main_img.original_filename, main_img.processing_status`;

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
      
      // 各ガチャにメイン画像URLを追加
      const gachasWithImages = await Promise.all(result.rows.map(async (gacha) => {
        let main_image_url = null;
        
        if (gacha.main_image_base_key && gacha.main_image_status === 'completed') {
          // メイン画像のバリアントを取得
          const variantQuery = `
            SELECT object_key, image_url, size_type, format_type
            FROM image_variants iv
            JOIN gacha_images gi ON iv.gacha_image_id = gi.id
            WHERE gi.base_object_key = $1 AND gi.is_main = true
            ORDER BY 
              CASE 
                WHEN iv.size_type = 'desktop' AND iv.format_type = 'webp' THEN 1
                WHEN iv.size_type = 'desktop' AND iv.format_type = 'jpeg' THEN 2
                ELSE 3
              END
            LIMIT 1
          `;
          
          const variantResult = await database.query(variantQuery, [gacha.main_image_base_key]);
          if (variantResult.rows.length > 0) {
            main_image_url = variantResult.rows[0].image_url;
          }
        }
        
        return {
          ...gacha,
          main_image_url
        };
      }));
      
      return gachasWithImages;
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
          COUNT(gr.id) as play_count,
          main_img.base_object_key as main_image_base_key,
          main_img.processing_status as main_image_status
        FROM gachas g
        LEFT JOIN users u ON g.user_id = u.id
        LEFT JOIN gacha_results gr ON g.id = gr.gacha_id
        LEFT JOIN gacha_images main_img ON g.id = main_img.gacha_id AND main_img.is_main = true
        WHERE g.is_public = true
        GROUP BY g.id, u.name, main_img.base_object_key, main_img.processing_status
        ORDER BY play_count DESC
        LIMIT $1
      `;
      const result = await database.query(query, [limit]);
      
      // 各ガチャにメイン画像URLを追加
      const gachasWithImages = await Promise.all(result.rows.map(async (gacha) => {
        let main_image_url = null;
        
        if (gacha.main_image_base_key && gacha.main_image_status === 'completed') {
          // メイン画像のバリアントを取得
          const variantQuery = `
            SELECT object_key, image_url, size_type, format_type
            FROM image_variants iv
            JOIN gacha_images gi ON iv.gacha_image_id = gi.id
            WHERE gi.base_object_key = $1 AND gi.is_main = true
            ORDER BY 
              CASE 
                WHEN iv.size_type = 'desktop' AND iv.format_type = 'webp' THEN 1
                WHEN iv.size_type = 'desktop' AND iv.format_type = 'jpeg' THEN 2
                ELSE 3
              END
            LIMIT 1
          `;
          
          const variantResult = await database.query(variantQuery, [gacha.main_image_base_key]);
          if (variantResult.rows.length > 0) {
            main_image_url = variantResult.rows[0].image_url;
          }
        }
        
        return {
          ...gacha,
          main_image_url
        };
      }));
      
      return gachasWithImages;
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
  static async findAllForUser(params) {
    try {
      // paramsが単一の引数として渡された場合とuserIdとoptionsとして渡された場合の両方に対応
      let userId, options;
      if (typeof params === 'object' && params.userId !== undefined) {
        userId = params.userId;
        options = params;
      } else {
        userId = arguments[0];
        options = arguments[1] || {};
      }
      
      const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc', search = '', offset: customOffset } = options;
      const offset = customOffset !== undefined ? customOffset : (page - 1) * limit;

      let whereClause = 'WHERE g.user_id = $1';
      let queryParams = [userId];
      let paramIndex = 2;

      // 検索条件がある場合
      if (search && search.trim()) {
        whereClause += ` AND (g.name ILIKE $${paramIndex} OR g.description ILIKE $${paramIndex})`;
        queryParams.push(`%${search.trim()}%`);
        paramIndex++;
      }

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
          0 as play_count,
          main_img.base_object_key as main_image_base_key,
          main_img.original_filename as main_image_filename,
          main_img.processing_status as main_image_status
        FROM gachas g
        LEFT JOIN gacha_items gi ON g.id = gi.gacha_id
        LEFT JOIN gacha_images main_img ON g.id = main_img.gacha_id AND main_img.is_main = true
        ${whereClause}
        GROUP BY g.id, g.name, g.description, g.price, g.is_public, g.created_at, g.updated_at, main_img.base_object_key, main_img.original_filename, main_img.processing_status
        ORDER BY g.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(limit, offset);

      const countWhereClause = search && search.trim() 
        ? 'WHERE user_id = $1 AND (name ILIKE $2 OR description ILIKE $2)'
        : 'WHERE user_id = $1';
      const countParams = search && search.trim() ? [userId, `%${search.trim()}%`] : [userId];

      const countQuery = `
        SELECT COUNT(*) as total
        FROM gachas
        ${countWhereClause}
      `;

      const [gachasResult, countResult] = await Promise.all([
        database.query(query, queryParams),
        database.query(countQuery, countParams)
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
        SET name = $1, description = $2, price = $3, is_public = $4, 
            display_from = $5, display_to = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7 AND user_id = $8
        RETURNING *
      `;

      const values = [
        gachaData.name,
        gachaData.description,
        gachaData.price,
        gachaData.is_public,
        gachaData.display_from || null,
        gachaData.display_to || null,
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

  // ユーザー用のガチャ作成
  static async createForUser(data) {
    try {
      const { name, description, price, isPublic = true, userId, displayFrom, displayTo } = data;
      
      const query = `
        INSERT INTO gachas (name, description, price, user_id, is_public, display_from, display_to, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `;

      const result = await database.query(query, [
        name,
        description, 
        price,
        userId,
        isPublic,
        displayFrom || null,
        displayTo || null
      ]);

      return new Gacha(result.rows[0]);
    } catch (error) {
      console.error('Error in createForUser:', error);
      throw error;
    }
  }

  // 特定のユーザーが所有するガチャをIDで取得
  static async findByIdForUser(gachaId, userId) {
    try {
      const query = `
        SELECT 
          g.*,
          u.name as creator_name
        FROM gachas g
        LEFT JOIN users u ON g.user_id = u.id
        WHERE g.id = $1 AND g.user_id = $2
      `;

      const result = await database.query(query, [gachaId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error in findByIdForUser:', error);
      throw error;
    }
  }

  // ユーザー用のガチャアイテム作成
  static async createItemForUser(gachaId, itemData, userId) {
    try {
      // まずガチャの所有者確認
      const gacha = await this.findByIdForUser(gachaId, userId);
      if (!gacha) {
        throw new Error('Gacha not found or access denied');
      }

      const { name, description, stock = 0, imageUrl, image_url, isPublic = true } = itemData;
      
      // image_urlフィールドを優先的に使用（admin.jsからの変換済みデータ）
      const finalImageUrl = image_url || imageUrl || null;
      
      const query = `
        INSERT INTO gacha_items (gacha_id, name, description, image_url, stock, is_public, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `;

      const result = await database.query(query, [
        gachaId,
        name,
        description,
        finalImageUrl,
        stock,
        isPublic
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error in createItemForUser:', error);
      throw error;
    }
  }

  // ユーザー用のガチャアイテム一覧取得
  static async getItemsForUser(gachaId, userId) {
    try {
      // まずガチャの所有者確認
      const gacha = await this.findByIdForUser(gachaId, userId);
      if (!gacha) {
        throw new Error('Gacha not found or access denied');
      }

      const query = `
        SELECT *
        FROM gacha_items
        WHERE gacha_id = $1
        ORDER BY created_at DESC
      `;

      const result = await database.query(query, [gachaId]);
      return result.rows;
    } catch (error) {
      console.error('Error in getItemsForUser:', error);
      throw error;
    }
  }

  // ユーザー用のガチャアイテム更新
  static async updateItemForUser(gachaId, itemId, itemData, userId) {
    try {
      // まずガチャの所有者確認
      const gacha = await this.findByIdForUser(gachaId, userId);
      if (!gacha) {
        throw new Error('Gacha not found or access denied');
      }

      // アイテムがそのガチャに属するかも確認
      const itemCheckQuery = `
        SELECT id FROM gacha_items
        WHERE id = $1 AND gacha_id = $2
      `;
      const itemCheck = await database.query(itemCheckQuery, [itemId, gachaId]);
      if (itemCheck.rows.length === 0) {
        throw new Error('Item not found in this gacha');
      }

      const { name, description, stock, imageUrl, isPublic } = itemData;
      
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(description);
      }
      if (stock !== undefined) {
        updateFields.push(`stock = $${paramIndex++}`);
        updateValues.push(stock);
      }
      if (imageUrl !== undefined) {
        updateFields.push(`image_url = $${paramIndex++}`);
        updateValues.push(imageUrl);
      }
      if (isPublic !== undefined) {
        updateFields.push(`is_public = $${paramIndex++}`);
        updateValues.push(isPublic);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(itemId);

      const query = `
        UPDATE gacha_items
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await database.query(query, updateValues);
      return result.rows[0];
    } catch (error) {
      console.error('Error in updateItemForUser:', error);
      throw error;
    }
  }

  // ユーザー用のガチャアイテム削除
  static async deleteItemForUser(gachaId, itemId, userId) {
    try {
      // まずガチャの所有者確認
      const gacha = await this.findByIdForUser(gachaId, userId);
      if (!gacha) {
        throw new Error('Gacha not found or access denied');
      }

      // アイテムがそのガチャに属するかも確認
      const itemCheckQuery = `
        SELECT id FROM gacha_items
        WHERE id = $1 AND gacha_id = $2
      `;
      const itemCheck = await database.query(itemCheckQuery, [itemId, gachaId]);
      if (itemCheck.rows.length === 0) {
        throw new Error('Item not found in this gacha');
      }

      const query = `
        DELETE FROM gacha_items
        WHERE id = $1 AND gacha_id = $2
        RETURNING *
      `;

      const result = await database.query(query, [itemId, gachaId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in deleteItemForUser:', error);
      throw error;
    }
  }

  // ガチャ画像管理メソッド群

  // ガチャ画像一覧取得
  static async getGachaImages(gachaId, userId) {
    try {
      // ガチャの所有者確認（既にルート側で確認済みの場合はスキップ可能）
      // この段階ではガチャの存在は確認済みなので、画像クエリのみ実行
      const query = `
        SELECT 
          gi.id,
          gi.gacha_id,
          gi.original_filename,
          gi.base_object_key,
          gi.original_size,
          gi.original_mime_type,
          gi.display_order,
          gi.is_main,
          gi.processing_status,
          gi.created_at,
          gi.updated_at,
          COUNT(iv.id) as variant_count,
          json_agg(
            json_build_object(
              'sizeType', iv.size_type,
              'formatType', iv.format_type,
              'objectKey', iv.object_key,
              'imageUrl', iv.image_url,
              'fileSize', iv.file_size,
              'width', iv.width,
              'height', iv.height,
              'quality', iv.quality
            ) ORDER BY iv.size_type, iv.format_type
          ) FILTER (WHERE iv.id IS NOT NULL) as variants
        FROM gacha_images gi
        LEFT JOIN image_variants iv ON gi.id = iv.gacha_image_id
        WHERE gi.gacha_id = $1 
        GROUP BY gi.id, gi.gacha_id, gi.original_filename, gi.base_object_key, 
                 gi.original_size, gi.original_mime_type, gi.display_order, 
                 gi.is_main, gi.processing_status, gi.created_at, gi.updated_at
        ORDER BY gi.display_order ASC, gi.created_at ASC
      `;

      const result = await database.query(query, [gachaId]);
      return result.rows;
    } catch (error) {
      console.error('Error in getGachaImages:', error);
      throw error;
    }
  }

  // ガチャ画像追加（従来版 - 非推奨、Sharp.js版の利用を推奨）
  static async addGachaImage(gachaId, imageData, userId) {
    console.warn('addGachaImage method is deprecated. Use Sharp.js image processing instead.');
    try {
      // ガチャの所有者確認
      const gacha = await this.findByIdForUser(gachaId, userId);
      if (!gacha) {
        throw new Error('Gacha not found or access denied');
      }

      // 現在の最大表示順序を取得
      const maxOrderQuery = `
        SELECT COALESCE(MAX(display_order), 0) as max_order 
        FROM gacha_images 
        WHERE gacha_id = $1
      `;
      const maxOrderResult = await database.query(maxOrderQuery, [gachaId]);
      const nextOrder = maxOrderResult.rows[0].max_order + 1;

      // 画像が1枚目の場合は自動的にメイン画像に設定
      const isFirstImage = nextOrder === 1;

      // 新しいテーブル構造に合わせて画像メタデータを保存
      // 従来形式のデータを新しい形式に変換
      const query = `
        INSERT INTO gacha_images (
          gacha_id, original_filename, base_object_key, 
          original_size, original_mime_type, display_order, 
          is_main, processing_status, created_at, updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const values = [
        gachaId,
        imageData.filename || imageData.original_filename,
        imageData.object_key || imageData.base_object_key,
        imageData.size || imageData.original_size,
        imageData.mime_type || imageData.original_mime_type,
        nextOrder,
        isFirstImage
      ];

      const result = await database.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in addGachaImage:', error);
      throw error;
    }
  }

  // ガチャ画像削除（Sharp.js対応）
  static async deleteGachaImage(gachaId, imageId, userId) {
    try {
      // ガチャの所有者確認
      const gacha = await this.findByIdForUser(gachaId, userId);
      if (!gacha) {
        throw new Error('Gacha not found or access denied');
      }

      // 画像がそのガチャに属するかも確認
      const imageCheckQuery = `
        SELECT id, display_order, is_main, base_object_key 
        FROM gacha_images
        WHERE id = $1 AND gacha_id = $2
      `;
      const imageCheck = await database.query(imageCheckQuery, [imageId, gachaId]);
      if (imageCheck.rows.length === 0) {
        throw new Error('Image not found in this gacha');
      }

      const deletedImage = imageCheck.rows[0];

      // 関連する画像バリアントも削除
      const deleteVariantsQuery = `
        DELETE FROM image_variants
        WHERE gacha_image_id = $1
        RETURNING object_key
      `;
      const variantResult = await database.query(deleteVariantsQuery, [imageId]);

      // 画像削除
      const deleteQuery = `
        DELETE FROM gacha_images
        WHERE id = $1 AND gacha_id = $2
        RETURNING *
      `;
      const deleteResult = await database.query(deleteQuery, [imageId, gachaId]);

      // 削除した画像より後の画像の表示順序を1つずつ前に移動
      const updateOrderQuery = `
        UPDATE gacha_images 
        SET display_order = display_order - 1 
        WHERE gacha_id = $1 AND display_order > $2
      `;
      await database.query(updateOrderQuery, [gachaId, deletedImage.display_order]);

      // メイン画像が削除された場合、最初の画像を新しいメイン画像に設定
      if (deletedImage.is_main) {
        const newMainQuery = `
          UPDATE gacha_images 
          SET is_main = true 
          WHERE gacha_id = $1 AND display_order = 1
        `;
        await database.query(newMainQuery, [gachaId]);
      }

      return {
        deletedImage: deleteResult.rows[0],
        deletedVariants: variantResult.rows,
        baseObjectKey: deletedImage.base_object_key
      };
    } catch (error) {
      console.error('Error in deleteGachaImage:', error);
      throw error;
    }
  }

  // ガチャ画像の並び順変更
  static async updateGachaImageOrder(gachaId, imageOrders, userId) {
    try {
      // ガチャの所有者確認
      const gacha = await this.findByIdForUser(gachaId, userId);
      if (!gacha) {
        throw new Error('Gacha not found or access denied');
      }

      // トランザクション開始
      await database.query('BEGIN');

      try {
        // 各画像の表示順序を更新
        for (const item of imageOrders) {
          const updateQuery = `
            UPDATE gacha_images 
            SET display_order = $1 
            WHERE id = $2 AND gacha_id = $3
          `;
          await database.query(updateQuery, [item.display_order, item.id, gachaId]);
        }

        // 最初の画像をメイン画像に設定
        const resetMainQuery = `
          UPDATE gacha_images 
          SET is_main = false 
          WHERE gacha_id = $1
        `;
        await database.query(resetMainQuery, [gachaId]);

        const setMainQuery = `
          UPDATE gacha_images 
          SET is_main = true 
          WHERE gacha_id = $1 AND display_order = 1
        `;
        await database.query(setMainQuery, [gachaId]);

        await database.query('COMMIT');

        // 更新後の画像一覧を返す
        return await this.getGachaImages(gachaId, userId);
      } catch (error) {
        await database.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error in updateGachaImageOrder:', error);
      throw error;
    }
  }

  // メイン画像設定
  static async setMainGachaImage(gachaId, imageId, userId) {
    try {
      // ガチャの所有者確認
      const gacha = await this.findByIdForUser(gachaId, userId);
      if (!gacha) {
        throw new Error('Gacha not found or access denied');
      }

      // 画像がそのガチャに属するかも確認
      const imageCheckQuery = `
        SELECT id FROM gacha_images
        WHERE id = $1 AND gacha_id = $2
      `;
      const imageCheck = await database.query(imageCheckQuery, [imageId, gachaId]);
      if (imageCheck.rows.length === 0) {
        throw new Error('Image not found in this gacha');
      }

      // トランザクション開始
      await database.query('BEGIN');

      try {
        // すべての画像のメインフラグをリセット
        const resetQuery = `
          UPDATE gacha_images 
          SET is_main = false 
          WHERE gacha_id = $1
        `;
        await database.query(resetQuery, [gachaId]);

        // 指定した画像をメイン画像に設定
        const setMainQuery = `
          UPDATE gacha_images 
          SET is_main = true 
          WHERE id = $1 AND gacha_id = $2
          RETURNING *
        `;
        const result = await database.query(setMainQuery, [imageId, gachaId]);

        await database.query('COMMIT');
        return result.rows[0];
      } catch (error) {
        await database.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error in setMainGachaImage:', error);
      throw error;
    }
  }
}

export default Gacha;
