-- Consolidated Initial Schema

-- 0. Function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE users IS 'All users are stored here. No roles.';

-- 2. gachas table
CREATE TABLE gachas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id),
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  display_from TIMESTAMP,
  display_to TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE gachas IS 'Gacha definitions. Created and managed by any user.';

-- 3. item_images table (for Sharp.js processing)
CREATE TABLE item_images (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    base_object_key VARCHAR(500) NOT NULL,
    original_size INTEGER NOT NULL,
    original_mime_type VARCHAR(50) NOT NULL,
    processing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_item_images_original_size_positive CHECK (original_size > 0),
    CONSTRAINT ck_item_images_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);
CREATE INDEX idx_item_images_user_id ON item_images(user_id);
CREATE INDEX idx_item_images_processing_status ON item_images(processing_status);
CREATE INDEX idx_item_images_is_public ON item_images(is_public);
CREATE TRIGGER trigger_item_images_updated_at
    BEFORE UPDATE ON item_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
COMMENT ON TABLE item_images IS 'Item image metadata for Sharp.js processing';
COMMENT ON COLUMN item_images.processing_status IS 'Processing status: pending, processing, completed, failed';

-- 4. gacha_items table
CREATE TABLE gacha_items (
  id SERIAL PRIMARY KEY,
  gacha_id INTEGER REFERENCES gachas(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  image_url VARCHAR(255),
  stock INTEGER,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  item_image_id INTEGER REFERENCES item_images(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_gacha_items_item_image_id ON gacha_items(item_image_id);

-- 5. gacha_results table
CREATE TABLE gacha_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  gacha_id INTEGER REFERENCES gachas(id),
  gacha_item_id INTEGER REFERENCES gacha_items(id),
  executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. admin_operation_logs table
CREATE TABLE admin_operation_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  operation VARCHAR(64) NOT NULL,
  target_table VARCHAR(64),
  target_id INTEGER,
  detail TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. gacha_images table (for Sharp.js processing)
CREATE TABLE gacha_images (
    id SERIAL PRIMARY KEY,
    gacha_id INTEGER NOT NULL REFERENCES gachas(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    base_object_key VARCHAR(500) NOT NULL,
    original_size INTEGER NOT NULL,
    original_mime_type VARCHAR(50) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    is_main BOOLEAN NOT NULL DEFAULT FALSE,
    processing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_gacha_images_gacha_display_order UNIQUE (gacha_id, display_order),
    CONSTRAINT ck_gacha_images_display_order_positive CHECK (display_order > 0),
    CONSTRAINT ck_gacha_images_original_size_positive CHECK (original_size > 0),
    CONSTRAINT ck_gacha_images_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);
CREATE INDEX idx_gacha_images_gacha_id ON gacha_images(gacha_id);
CREATE INDEX idx_gacha_images_gacha_display_order ON gacha_images(gacha_id, display_order);
CREATE INDEX idx_gacha_images_is_main ON gacha_images(gacha_id, is_main);
CREATE INDEX idx_gacha_images_processing_status ON gacha_images(processing_status);
CREATE TRIGGER trigger_gacha_images_updated_at
    BEFORE UPDATE ON gacha_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
COMMENT ON TABLE gacha_images IS 'Gacha image metadata for Sharp.js processing';
COMMENT ON COLUMN gacha_images.processing_status IS 'Processing status: pending, processing, completed, failed';

-- 8. image_variants table
CREATE TABLE image_variants (
    id SERIAL PRIMARY KEY,
    gacha_image_id INTEGER NOT NULL REFERENCES gacha_images(id) ON DELETE CASCADE,
    size_type VARCHAR(20) NOT NULL,
    format_type VARCHAR(10) NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    quality INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_image_variants_unique UNIQUE (gacha_image_id, size_type, format_type),
    CONSTRAINT ck_image_variants_size_type CHECK (size_type IN ('original', 'desktop', 'mobile', 'thumbnail')),
    CONSTRAINT ck_image_variants_format_type CHECK (format_type IN ('avif', 'webp', 'jpeg')),
    CONSTRAINT ck_image_variants_dimensions_positive CHECK (width > 0 AND height > 0),
    CONSTRAINT ck_image_variants_file_size_positive CHECK (file_size > 0),
    CONSTRAINT ck_image_variants_quality_range CHECK (quality IS NULL OR (quality >= 1 AND quality <= 100))
);
CREATE INDEX idx_image_variants_gacha_image_id ON image_variants(gacha_image_id);
CREATE INDEX idx_image_variants_size_type_format ON image_variants(gacha_image_id, size_type, format_type);
COMMENT ON TABLE image_variants IS 'Gacha image variants (size/format)';
COMMENT ON COLUMN image_variants.size_type IS 'Size type: original, desktop, mobile, thumbnail';
COMMENT ON COLUMN image_variants.format_type IS 'Format: avif, webp, jpeg';

-- 9. item_image_variants table
CREATE TABLE item_image_variants (
    id SERIAL PRIMARY KEY,
    item_image_id INTEGER NOT NULL REFERENCES item_images(id) ON DELETE CASCADE,
    size_type VARCHAR(20) NOT NULL,
    format_type VARCHAR(10) NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    quality INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_item_image_variants_unique UNIQUE (item_image_id, size_type, format_type),
    CONSTRAINT ck_item_image_variants_size_type CHECK (size_type IN ('original', 'desktop', 'mobile', 'thumbnail')),
    CONSTRAINT ck_item_image_variants_format_type CHECK (format_type IN ('avif', 'webp', 'jpeg')),
    CONSTRAINT ck_item_image_variants_dimensions_positive CHECK (width > 0 AND height > 0),
    CONSTRAINT ck_item_image_variants_file_size_positive CHECK (file_size > 0),
    CONSTRAINT ck_item_image_variants_quality_range CHECK (quality IS NULL OR (quality >= 1 AND quality <= 100))
);
CREATE INDEX idx_item_image_variants_item_image_id ON item_image_variants(item_image_id);
CREATE INDEX idx_item_image_variants_size_type_format ON item_image_variants(item_image_id, size_type, format_type);
COMMENT ON TABLE item_image_variants IS 'Item image variants (size/format)';
COMMENT ON COLUMN item_image_variants.size_type IS 'Size type: original, desktop, mobile, thumbnail';
COMMENT ON COLUMN item_image_variants.format_type IS 'Format: avif, webp, jpeg';

-- 10. Views and Functions for Image Processing
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
        WHEN COUNT(iv.id) = 12 THEN 'complete' -- 4 sizes × 3 formats = 12
        WHEN COUNT(iv.id) > 0 THEN 'partial'
        ELSE 'none'
    END as variant_status
FROM gacha_images gi
LEFT JOIN image_variants iv ON gi.id = iv.gacha_image_id
GROUP BY gi.id
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
GROUP BY ii.id;

COMMENT ON VIEW v_image_processing_status IS 'View to monitor image processing status';

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
GROUP BY ii.id;

COMMENT ON VIEW v_image_usage_status IS 'View to check image usage status';

CREATE OR REPLACE FUNCTION retry_failed_image_processing()
RETURNS TABLE(image_type TEXT, image_id INTEGER, filename TEXT) AS $$
BEGIN
    UPDATE gacha_images SET processing_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE processing_status = 'failed';
    UPDATE item_images SET processing_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE processing_status = 'failed';
    RETURN QUERY
    SELECT 'gacha_images'::TEXT, gi.id, gi.original_filename FROM gacha_images gi WHERE gi.processing_status = 'pending'
    UNION ALL
    SELECT 'item_images'::TEXT, ii.id, ii.original_filename FROM item_images ii WHERE ii.processing_status = 'pending';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION retry_failed_image_processing() IS 'Resets failed image processing jobs to pending';

CREATE OR REPLACE FUNCTION find_orphaned_images()
RETURNS TABLE(image_id INTEGER, filename TEXT, user_id INTEGER, created_at TIMESTAMP, total_file_size BIGINT) AS $$
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
    WHERE gi.id IS NULL
    GROUP BY ii.id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_orphaned_images() IS 'Finds item images that are not used in any gacha_items';

CREATE OR REPLACE FUNCTION get_image_processing_progress()
RETURNS TABLE(image_type TEXT, pending_count BIGINT, processing_count BIGINT, completed_count BIGINT, failed_count BIGINT, total_count BIGINT, completion_rate NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'gacha_images'::TEXT,
        COUNT(*) FILTER (WHERE processing_status = 'pending'),
        COUNT(*) FILTER (WHERE processing_status = 'processing'),
        COUNT(*) FILTER (WHERE processing_status = 'completed'),
        COUNT(*) FILTER (WHERE processing_status = 'failed'),
        COUNT(*),
        CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE processing_status = 'completed') * 100.0 / COUNT(*), 2) ELSE 0 END
    FROM gacha_images
    UNION ALL
    SELECT
        'item_images'::TEXT,
        COUNT(*) FILTER (WHERE processing_status = 'pending'),
        COUNT(*) FILTER (WHERE processing_status = 'processing'),
        COUNT(*) FILTER (WHERE processing_status = 'completed'),
        COUNT(*) FILTER (WHERE processing_status = 'failed'),
        COUNT(*),
        CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE processing_status = 'completed') * 100.0 / COUNT(*), 2) ELSE 0 END
    FROM item_images;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_image_processing_progress() IS 'Get progress statistics for image processing';
