/* eslint-disable camelcase */

exports.up = pgm => {
  // 1. 既存のガチャ画像テーブルをバックアップ
  pgm.sql('CREATE TABLE gacha_images_backup AS SELECT * FROM gacha_images');

  // 2. 既存テーブル削除
  pgm.dropTable('gacha_images', { cascade: true });

  // 3. 新しいガチャ画像テーブル作成（Sharp.js対応）
  pgm.createTable('gacha_images', {
    id: { type: 'serial', primaryKey: true },
    gacha_id: { type: 'integer', notNull: true },
    original_filename: { type: 'varchar(255)', notNull: true },
    base_object_key: { type: 'varchar(500)', notNull: true },
    original_size: { type: 'integer', notNull: true },
    original_mime_type: { type: 'varchar(50)', notNull: true },
    display_order: { type: 'integer', notNull: true, default: 1 },
    is_main: { type: 'boolean', notNull: true, default: false },
    processing_status: { type: 'varchar(20)', notNull: true, default: 'pending' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // 4. ガチャ画像バリアントテーブル作成
  pgm.createTable('image_variants', {
    id: { type: 'serial', primaryKey: true },
    gacha_image_id: { type: 'integer', notNull: true },
    size_type: { type: 'varchar(20)', notNull: true },
    format_type: { type: 'varchar(10)', notNull: true },
    object_key: { type: 'varchar(500)', notNull: true },
    image_url: { type: 'varchar(500)', notNull: true },
    file_size: { type: 'integer', notNull: true },
    width: { type: 'integer', notNull: true },
    height: { type: 'integer', notNull: true },
    quality: { type: 'integer' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // 5. アイテム画像テーブル作成
  pgm.createTable('item_images', {
    id: { type: 'serial', primaryKey: true },
    user_id: { type: 'integer', notNull: true },
    original_filename: { type: 'varchar(255)', notNull: true },
    base_object_key: { type: 'varchar(500)', notNull: true },
    original_size: { type: 'integer', notNull: true },
    original_mime_type: { type: 'varchar(50)', notNull: true },
    processing_status: { type: 'varchar(20)', notNull: true, default: 'pending' },
    is_public: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // 6. アイテム画像バリアントテーブル作成
  pgm.createTable('item_image_variants', {
    id: { type: 'serial', primaryKey: true },
    item_image_id: { type: 'integer', notNull: true },
    size_type: { type: 'varchar(20)', notNull: true },
    format_type: { type: 'varchar(10)', notNull: true },
    object_key: { type: 'varchar(500)', notNull: true },
    image_url: { type: 'varchar(500)', notNull: true },
    file_size: { type: 'integer', notNull: true },
    width: { type: 'integer', notNull: true },
    height: { type: 'integer', notNull: true },
    quality: { type: 'integer' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // 7. 外部キー制約追加
  pgm.addConstraint('gacha_images', 'fk_gacha_images_gacha_id', {
    foreignKeys: {
      columns: 'gacha_id',
      references: 'gachas(id)',
      onDelete: 'CASCADE'
    }
  });

  pgm.addConstraint('image_variants', 'fk_image_variants_gacha_image_id', {
    foreignKeys: {
      columns: 'gacha_image_id',
      references: 'gacha_images(id)',
      onDelete: 'CASCADE'
    }
  });

  pgm.addConstraint('item_images', 'fk_item_images_user_id', {
    foreignKeys: {
      columns: 'user_id',
      references: 'users(id)',
      onDelete: 'CASCADE'
    }
  });

  pgm.addConstraint('item_image_variants', 'fk_item_image_variants_item_image_id', {
    foreignKeys: {
      columns: 'item_image_id',
      references: 'item_images(id)',
      onDelete: 'CASCADE'
    }
  });

  // 8. ユニーク制約追加
  pgm.addConstraint('gacha_images', 'uk_gacha_images_gacha_display_order', {
    unique: ['gacha_id', 'display_order']
  });

  pgm.addConstraint('image_variants', 'uk_image_variants_unique', {
    unique: ['gacha_image_id', 'size_type', 'format_type']
  });

  pgm.addConstraint('item_image_variants', 'uk_item_image_variants_unique', {
    unique: ['item_image_id', 'size_type', 'format_type']
  });

  // 9. チェック制約追加
  pgm.addConstraint('gacha_images', 'ck_gacha_images_display_order_positive', {
    check: 'display_order > 0'
  });

  pgm.addConstraint('gacha_images', 'ck_gacha_images_original_size_positive', {
    check: 'original_size > 0'
  });

  pgm.addConstraint('gacha_images', 'ck_gacha_images_processing_status', {
    check: "processing_status IN ('pending', 'processing', 'completed', 'failed')"
  });

  pgm.addConstraint('image_variants', 'ck_image_variants_size_type', {
    check: "size_type IN ('original', 'desktop', 'mobile', 'thumbnail')"
  });

  pgm.addConstraint('image_variants', 'ck_image_variants_format_type', {
    check: "format_type IN ('avif', 'webp', 'jpeg')"
  });

  pgm.addConstraint('image_variants', 'ck_image_variants_dimensions_positive', {
    check: 'width > 0 AND height > 0'
  });

  pgm.addConstraint('image_variants', 'ck_image_variants_file_size_positive', {
    check: 'file_size > 0'
  });

  pgm.addConstraint('image_variants', 'ck_image_variants_quality_range', {
    check: 'quality IS NULL OR (quality >= 1 AND quality <= 100)'
  });

  pgm.addConstraint('item_images', 'ck_item_images_original_size_positive', {
    check: 'original_size > 0'
  });

  pgm.addConstraint('item_images', 'ck_item_images_processing_status', {
    check: "processing_status IN ('pending', 'processing', 'completed', 'failed')"
  });

  pgm.addConstraint('item_image_variants', 'ck_item_image_variants_size_type', {
    check: "size_type IN ('original', 'desktop', 'mobile', 'thumbnail')"
  });

  pgm.addConstraint('item_image_variants', 'ck_item_image_variants_format_type', {
    check: "format_type IN ('avif', 'webp', 'jpeg')"
  });

  pgm.addConstraint('item_image_variants', 'ck_item_image_variants_dimensions_positive', {
    check: 'width > 0 AND height > 0'
  });

  pgm.addConstraint('item_image_variants', 'ck_item_image_variants_file_size_positive', {
    check: 'file_size > 0'
  });

  pgm.addConstraint('item_image_variants', 'ck_item_image_variants_quality_range', {
    check: 'quality IS NULL OR (quality >= 1 AND quality <= 100)'
  });

  // 10. gacha_itemsテーブルにitem_image_idカラム追加
  pgm.addColumn('gacha_items', {
    item_image_id: { type: 'integer' }
  });

  pgm.addConstraint('gacha_items', 'fk_gacha_items_item_image_id', {
    foreignKeys: {
      columns: 'item_image_id',
      references: 'item_images(id)',
      onDelete: 'SET NULL'
    }
  });

  // 11. インデックス作成
  pgm.createIndex('gacha_images', 'gacha_id');
  pgm.createIndex('gacha_images', ['gacha_id', 'display_order']);
  pgm.createIndex('gacha_images', ['gacha_id', 'is_main']);
  pgm.createIndex('gacha_images', 'processing_status');

  pgm.createIndex('image_variants', 'gacha_image_id');
  pgm.createIndex('image_variants', ['gacha_image_id', 'size_type', 'format_type']);
  pgm.createIndex('image_variants', 'size_type');
  pgm.createIndex('image_variants', 'format_type');

  pgm.createIndex('item_images', 'user_id');
  pgm.createIndex('item_images', 'processing_status');
  pgm.createIndex('item_images', 'is_public');

  pgm.createIndex('item_image_variants', 'item_image_id');
  pgm.createIndex('item_image_variants', ['item_image_id', 'size_type', 'format_type']);
  pgm.createIndex('item_image_variants', 'size_type');
  pgm.createIndex('item_image_variants', 'format_type');

  pgm.createIndex('gacha_items', 'item_image_id');

  // 12. updated_at自動更新トリガー関数作成
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // 13. トリガー作成
  pgm.sql(`
    CREATE TRIGGER trigger_gacha_images_updated_at
        BEFORE UPDATE ON gacha_images
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `);

  pgm.sql(`
    CREATE TRIGGER trigger_item_images_updated_at
        BEFORE UPDATE ON item_images
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `);

  // 14. マイグレーション完了ログ
  pgm.sql(`
    INSERT INTO admin_operation_logs (user_id, operation, target_table, detail, created_at)
    VALUES (1, 'MIGRATION', 'gacha_images,image_variants,item_images,item_image_variants', 'Sharp.js image system migration completed', CURRENT_TIMESTAMP);
  `);

  // 15. テーブルコメント追加
  pgm.sql("COMMENT ON TABLE gacha_images IS 'ガチャ画像メタデータ（Sharp.js対応）'");
  pgm.sql("COMMENT ON TABLE image_variants IS 'ガチャ画像バリアント（サイズ・フォーマット別）'");
  pgm.sql("COMMENT ON TABLE item_images IS 'アイテム画像メタデータ（Sharp.js対応）'");
  pgm.sql("COMMENT ON TABLE item_image_variants IS 'アイテム画像バリアント（サイズ・フォーマット別）'");

  pgm.sql("COMMENT ON COLUMN gacha_images.processing_status IS '処理状況: pending, processing, completed, failed'");
  pgm.sql("COMMENT ON COLUMN image_variants.size_type IS 'サイズ種別: original, desktop, mobile, thumbnail'");
  pgm.sql("COMMENT ON COLUMN image_variants.format_type IS 'フォーマット: avif, webp, jpeg'");
  pgm.sql("COMMENT ON COLUMN item_images.processing_status IS '処理状況: pending, processing, completed, failed'");
  pgm.sql("COMMENT ON COLUMN item_image_variants.size_type IS 'サイズ種別: original, desktop, mobile, thumbnail'");
  pgm.sql("COMMENT ON COLUMN item_image_variants.format_type IS 'フォーマット: avif, webp, jpeg'");
};

exports.down = pgm => {
  // ロールバック処理
  
  // 1. 外部キー制約削除
  pgm.dropConstraint('gacha_items', 'fk_gacha_items_item_image_id', { ifExists: true });
  pgm.dropColumn('gacha_items', 'item_image_id', { ifExists: true });

  // 2. Sharp.js対応テーブル削除
  pgm.dropTable('item_image_variants', { cascade: true, ifExists: true });
  pgm.dropTable('item_images', { cascade: true, ifExists: true });
  pgm.dropTable('image_variants', { cascade: true, ifExists: true });
  pgm.dropTable('gacha_images', { cascade: true, ifExists: true });

  // 3. 元のガチャ画像テーブル復元
  pgm.createTable('gacha_images', {
    id: { type: 'serial', primaryKey: true },
    gacha_id: { type: 'integer', notNull: true },
    image_url: { type: 'varchar(500)', notNull: true },
    object_key: { type: 'varchar(500)', notNull: true },
    filename: { type: 'varchar(255)', notNull: true },
    size: { type: 'integer', notNull: true },
    mime_type: { type: 'varchar(50)', notNull: true },
    display_order: { type: 'integer', notNull: true, default: 1 },
    is_main: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // 4. 制約復元
  pgm.addConstraint('gacha_images', 'fk_gacha_images_gacha_id', {
    foreignKeys: {
      columns: 'gacha_id',
      references: 'gachas(id)',
      onDelete: 'CASCADE'
    }
  });

  pgm.addConstraint('gacha_images', 'uk_gacha_images_gacha_display_order', {
    unique: ['gacha_id', 'display_order']
  });

  pgm.addConstraint('gacha_images', 'ck_gacha_images_display_order_positive', {
    check: 'display_order > 0'
  });

  pgm.addConstraint('gacha_images', 'ck_gacha_images_size_positive', {
    check: 'size > 0'
  });

  // 5. インデックス復元
  pgm.createIndex('gacha_images', 'gacha_id');
  pgm.createIndex('gacha_images', ['gacha_id', 'display_order']);
  pgm.createIndex('gacha_images', ['gacha_id', 'is_main']);

  // 6. トリガー復元
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_gacha_images_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  pgm.sql(`
    CREATE TRIGGER trigger_gacha_images_updated_at
        BEFORE UPDATE ON gacha_images
        FOR EACH ROW
        EXECUTE FUNCTION update_gacha_images_updated_at();
  `);

  // 7. バックアップデータ復元（存在する場合）
  pgm.sql(`
    INSERT INTO gacha_images (gacha_id, image_url, object_key, filename, size, mime_type, display_order, is_main, created_at, updated_at)
    SELECT gacha_id, image_url, object_key, filename, size, mime_type, display_order, is_main, created_at, updated_at
    FROM gacha_images_backup
    WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gacha_images_backup');
  `);

  // 8. バックアップテーブル削除
  pgm.dropTable('gacha_images_backup', { ifExists: true });

  // 9. 不要な関数削除
  pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column()');

  // 10. ロールバック完了ログ
  pgm.sql(`
    INSERT INTO admin_operation_logs (user_id, operation, target_table, detail, created_at)
    VALUES (1, 'ROLLBACK', 'gacha_images', 'Sharp.js image system rollback completed', CURRENT_TIMESTAMP);
  `);

  pgm.sql("COMMENT ON TABLE gacha_images IS 'ガチャ画像情報（従来形式）'");
};
