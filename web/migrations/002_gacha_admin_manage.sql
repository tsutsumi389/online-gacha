-- 002_gacha_admin_manage.sql
-- ガチャ管理画面の設計変更に伴うマイグレーション

-- gachasテーブルに公開/非公開、表示期間、画像URL(複数対応用)カラム追加
ALTER TABLE gachas
  ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN display_from TIMESTAMP,
  ADD COLUMN display_to TIMESTAMP;

-- gachas_imagesテーブル新設（ガチャごとに複数画像を持てるように）
CREATE TABLE gachas_images (
  id SERIAL PRIMARY KEY,
  gacha_id INTEGER REFERENCES gachas(id) ON DELETE CASCADE,
  image_url VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- gacha_itemsテーブルに公開/非公開カラム追加
ALTER TABLE gacha_items
  ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT TRUE;

-- 操作ログテーブル（監査用）
CREATE TABLE admin_operation_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admins(id),
  operation VARCHAR(64) NOT NULL,
  target_table VARCHAR(64),
  target_id INTEGER,
  detail TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
