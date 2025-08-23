/* eslint-disable camelcase */

exports.up = pgm => {
  // 1. 画像処理完了状況を確認するビュー
  pgm.sql(`
    CREATE OR REPLACE VIEW v_image_processing_status AS
    SELECT 
        'gacha_images' as image_type,
        gi.id,
        gi.gacha_id as parent_id,
        gi.original_filename,
        gi.processing_status,
        gi.created_at,
        COUNT(iv.id) as generated_variants,
        CASE 
            WHEN COUNT(iv.id) = 12 THEN 'complete' -- 4サイズ × 3フォーマット = 12
            WHEN COUNT(iv.id) > 0 THEN 'partial'
            ELSE 'none'
        END as variant_status
    FROM gacha_images gi
    LEFT JOIN image_variants iv ON gi.id = iv.gacha_image_id
    GROUP BY gi.id, gi.gacha_id, gi.original_filename, gi.processing_status, gi.created_at

    UNION ALL

    SELECT 
        'item_images' as image_type,
        ii.id,
        ii.user_id as parent_id,
        ii.original_filename,
        ii.processing_status,
        ii.created_at,
        COUNT(iiv.id) as generated_variants,
        CASE 
            WHEN COUNT(iiv.id) = 12 THEN 'complete'
            WHEN COUNT(iiv.id) > 0 THEN 'partial'
            ELSE 'none'
        END as variant_status
    FROM item_images ii
    LEFT JOIN item_image_variants iiv ON ii.id = iiv.item_image_id
    GROUP BY ii.id, ii.user_id, ii.original_filename, ii.processing_status, ii.created_at;
  `);

  // 2. 画像使用状況を確認するビュー
  pgm.sql(`
    CREATE OR REPLACE VIEW v_image_usage_status AS
    SELECT 
        ii.id as image_id,
        ii.original_filename,
        ii.user_id,
        ii.processing_status,
        COUNT(gi.id) as usage_count,
        ARRAY_AGG(gi.name) FILTER (WHERE gi.name IS NOT NULL) as used_in_items
    FROM item_images ii
    LEFT JOIN gacha_items gi ON ii.id = gi.item_image_id
    GROUP BY ii.id, ii.original_filename, ii.user_id, ii.processing_status;
  `);

  // 3. 画像処理失敗時の再処理関数
  pgm.sql(`
    CREATE OR REPLACE FUNCTION retry_failed_image_processing()
    RETURNS TABLE(
        image_type TEXT,
        image_id INTEGER,
        filename TEXT
    ) AS $$
    BEGIN
        -- ガチャ画像の失敗分を再処理対象に変更
        UPDATE gacha_images 
        SET processing_status = 'pending', updated_at = CURRENT_TIMESTAMP
        WHERE processing_status = 'failed';
        
        -- アイテム画像の失敗分を再処理対象に変更
        UPDATE item_images 
        SET processing_status = 'pending', updated_at = CURRENT_TIMESTAMP
        WHERE processing_status = 'failed';
        
        -- 再処理対象の一覧を返す
        RETURN QUERY
        SELECT 
            'gacha_images'::TEXT,
            gi.id,
            gi.original_filename
        FROM gacha_images gi
        WHERE gi.processing_status = 'pending'
        
        UNION ALL
        
        SELECT 
            'item_images'::TEXT,
            ii.id,
            ii.original_filename
        FROM item_images ii
        WHERE ii.processing_status = 'pending';
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 4. 孤立画像（使用されていない画像）を検索する関数
  pgm.sql(`
    CREATE OR REPLACE FUNCTION find_orphaned_images()
    RETURNS TABLE(
        image_id INTEGER,
        filename TEXT,
        user_id INTEGER,
        created_at TIMESTAMP,
        total_file_size BIGINT
    ) AS $$
    BEGIN
        RETURN QUERY
        SELECT 
            ii.id,
            ii.original_filename,
            ii.user_id,
            ii.created_at,
            COALESCE(SUM(iiv.file_size), 0) as total_file_size
        FROM item_images ii
        LEFT JOIN gacha_items gi ON ii.id = gi.item_image_id
        LEFT JOIN item_image_variants iiv ON ii.id = iiv.item_image_id
        WHERE gi.id IS NULL -- 使用されていない
        GROUP BY ii.id, ii.original_filename, ii.user_id, ii.created_at;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 5. 画像サイズ統計を取得する関数
  pgm.sql(`
    CREATE OR REPLACE FUNCTION get_image_size_statistics()
    RETURNS TABLE(
        size_type TEXT,
        format_type TEXT,
        avg_file_size NUMERIC,
        total_file_size BIGINT,
        image_count BIGINT
    ) AS $$
    BEGIN
        RETURN QUERY
        SELECT 
            iv.size_type,
            iv.format_type,
            AVG(iv.file_size) as avg_file_size,
            SUM(iv.file_size) as total_file_size,
            COUNT(iv.id) as image_count
        FROM image_variants iv
        GROUP BY iv.size_type, iv.format_type
        
        UNION ALL
        
        SELECT 
            iiv.size_type,
            iiv.format_type,
            AVG(iiv.file_size) as avg_file_size,
            SUM(iiv.file_size) as total_file_size,
            COUNT(iiv.id) as image_count
        FROM item_image_variants iiv
        GROUP BY iiv.size_type, iiv.format_type
        
        ORDER BY size_type, format_type;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 6. 画像バリアント一括削除関数（メンテナンス用）
  pgm.sql(`
    CREATE OR REPLACE FUNCTION cleanup_incomplete_image_variants()
    RETURNS INTEGER AS $$
    DECLARE
        deleted_count INTEGER := 0;
    BEGIN
        -- 親画像が 'failed' ステータスのバリアントを削除
        WITH deleted AS (
            DELETE FROM image_variants iv
            USING gacha_images gi
            WHERE iv.gacha_image_id = gi.id 
            AND gi.processing_status = 'failed'
            RETURNING iv.id
        )
        SELECT COUNT(*) INTO deleted_count FROM deleted;
        
        -- アイテム画像も同様に処理
        WITH deleted AS (
            DELETE FROM item_image_variants iiv
            USING item_images ii
            WHERE iiv.item_image_id = ii.id 
            AND ii.processing_status = 'failed'
            RETURNING iiv.id
        )
        SELECT deleted_count + COUNT(*) INTO deleted_count FROM deleted;
        
        RETURN deleted_count;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 7. 画像処理進捗モニタリング関数
  pgm.sql(`
    CREATE OR REPLACE FUNCTION get_image_processing_progress()
    RETURNS TABLE(
        image_type TEXT,
        pending_count BIGINT,
        processing_count BIGINT,
        completed_count BIGINT,
        failed_count BIGINT,
        total_count BIGINT,
        completion_rate NUMERIC
    ) AS $$
    BEGIN
        RETURN QUERY
        SELECT 
            'gacha_images'::TEXT as image_type,
            COUNT(*) FILTER (WHERE processing_status = 'pending') as pending_count,
            COUNT(*) FILTER (WHERE processing_status = 'processing') as processing_count,
            COUNT(*) FILTER (WHERE processing_status = 'completed') as completed_count,
            COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_count,
            COUNT(*) as total_count,
            CASE 
                WHEN COUNT(*) > 0 THEN 
                    ROUND(COUNT(*) FILTER (WHERE processing_status = 'completed') * 100.0 / COUNT(*), 2)
                ELSE 0
            END as completion_rate
        FROM gacha_images
        
        UNION ALL
        
        SELECT 
            'item_images'::TEXT as image_type,
            COUNT(*) FILTER (WHERE processing_status = 'pending') as pending_count,
            COUNT(*) FILTER (WHERE processing_status = 'processing') as processing_count,
            COUNT(*) FILTER (WHERE processing_status = 'completed') as completed_count,
            COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_count,
            COUNT(*) as total_count,
            CASE 
                WHEN COUNT(*) > 0 THEN 
                    ROUND(COUNT(*) FILTER (WHERE processing_status = 'completed') * 100.0 / COUNT(*), 2)
                ELSE 0
            END as completion_rate
        FROM item_images;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 8. パフォーマンス向上のための追加インデックス
  pgm.createIndex('gacha_images', ['processing_status', 'created_at'], { 
    name: 'idx_gacha_images_processing_status_created',
    ifNotExists: true 
  });
  
  pgm.createIndex('item_images', ['processing_status', 'created_at'], { 
    name: 'idx_item_images_processing_status_created',
    ifNotExists: true 
  });
  
  pgm.createIndex('image_variants', ['size_type', 'format_type', 'created_at'], { 
    name: 'idx_image_variants_size_format_created',
    ifNotExists: true 
  });
  
  pgm.createIndex('item_image_variants', ['size_type', 'format_type', 'created_at'], { 
    name: 'idx_item_image_variants_size_format_created',
    ifNotExists: true 
  });

  // 9. マイグレーション完了ログ
  pgm.sql(`
    INSERT INTO admin_operation_logs (user_id, operation, target_table, detail, created_at)
    VALUES (1, 'MIGRATION', 'utilities', 'Image processing utilities and views created', CURRENT_TIMESTAMP);
  `);

  // 10. コメント追加
  pgm.sql("COMMENT ON VIEW v_image_processing_status IS '画像処理状況を監視するビュー'");
  pgm.sql("COMMENT ON VIEW v_image_usage_status IS '画像使用状況を確認するビュー'");
  pgm.sql("COMMENT ON FUNCTION retry_failed_image_processing() IS '失敗した画像処理を再試行対象に変更'");
  pgm.sql("COMMENT ON FUNCTION find_orphaned_images() IS '使用されていない孤立画像を検索'");
  pgm.sql("COMMENT ON FUNCTION get_image_size_statistics() IS '画像サイズ・フォーマット別統計情報を取得'");
  pgm.sql("COMMENT ON FUNCTION cleanup_incomplete_image_variants() IS '不完全な画像バリアントを削除'");
  pgm.sql("COMMENT ON FUNCTION get_image_processing_progress() IS '画像処理進捗状況を取得'");
};

exports.down = pgm => {
  // ロールバック処理

  // 1. インデックス削除
  pgm.dropIndex('gacha_images', ['processing_status', 'created_at'], { 
    name: 'idx_gacha_images_processing_status_created',
    ifExists: true 
  });
  
  pgm.dropIndex('item_images', ['processing_status', 'created_at'], { 
    name: 'idx_item_images_processing_status_created',
    ifExists: true 
  });
  
  pgm.dropIndex('image_variants', ['size_type', 'format_type', 'created_at'], { 
    name: 'idx_image_variants_size_format_created',
    ifExists: true 
  });
  
  pgm.dropIndex('item_image_variants', ['size_type', 'format_type', 'created_at'], { 
    name: 'idx_item_image_variants_size_format_created',
    ifExists: true 
  });

  // 2. 関数削除
  pgm.sql('DROP FUNCTION IF EXISTS get_image_processing_progress()');
  pgm.sql('DROP FUNCTION IF EXISTS cleanup_incomplete_image_variants()');
  pgm.sql('DROP FUNCTION IF EXISTS get_image_size_statistics()');
  pgm.sql('DROP FUNCTION IF EXISTS find_orphaned_images()');
  pgm.sql('DROP FUNCTION IF EXISTS retry_failed_image_processing()');

  // 3. ビュー削除
  pgm.sql('DROP VIEW IF EXISTS v_image_usage_status');
  pgm.sql('DROP VIEW IF EXISTS v_image_processing_status');

  // 4. ロールバック完了ログ
  pgm.sql(`
    INSERT INTO admin_operation_logs (user_id, operation, target_table, detail, created_at)
    VALUES (1, 'ROLLBACK', 'utilities', 'Image processing utilities rollback completed', CURRENT_TIMESTAMP);
  `);
};
