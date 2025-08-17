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
}

export default Gacha;
