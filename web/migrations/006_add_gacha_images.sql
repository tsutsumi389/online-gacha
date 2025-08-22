-- 006_add_gacha_images.sql
-- ガチャ画像管理テーブルの追加

CREATE TABLE gacha_images (
    id SERIAL PRIMARY KEY,
    gacha_id INTEGER NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    size INTEGER NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    is_main BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_gacha_images_gacha_id 
        FOREIGN KEY (gacha_id) REFERENCES gachas(id) ON DELETE CASCADE,
    
    -- ユニーク制約（同一ガチャ内での表示順序重複防止）
    CONSTRAINT uk_gacha_images_gacha_display_order 
        UNIQUE (gacha_id, display_order),
    
    -- チェック制約
    CONSTRAINT ck_gacha_images_display_order_positive 
        CHECK (display_order > 0),
    CONSTRAINT ck_gacha_images_size_positive 
        CHECK (size > 0)
);

-- インデックス作成
CREATE INDEX idx_gacha_images_gacha_id ON gacha_images(gacha_id);
CREATE INDEX idx_gacha_images_display_order ON gacha_images(gacha_id, display_order);
CREATE INDEX idx_gacha_images_is_main ON gacha_images(gacha_id, is_main);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_gacha_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_gacha_images_updated_at
    BEFORE UPDATE ON gacha_images
    FOR EACH ROW
    EXECUTE FUNCTION update_gacha_images_updated_at();

-- コメント追加
COMMENT ON TABLE gacha_images IS 'ガチャ画像管理テーブル';
COMMENT ON COLUMN gacha_images.gacha_id IS '関連するガチャのID';
COMMENT ON COLUMN gacha_images.image_url IS 'MinIO経由でアクセス可能な画像URL';
COMMENT ON COLUMN gacha_images.object_key IS 'MinIOバケット内のオブジェクトキー';
COMMENT ON COLUMN gacha_images.filename IS 'アップロード時の元ファイル名';
COMMENT ON COLUMN gacha_images.size IS 'ファイルサイズ（バイト）';
COMMENT ON COLUMN gacha_images.mime_type IS 'ファイルのMIMEタイプ';
COMMENT ON COLUMN gacha_images.display_order IS '表示順序（1から開始）';
COMMENT ON COLUMN gacha_images.is_main IS 'メイン画像フラグ（ガチャ一覧等で表示）';
