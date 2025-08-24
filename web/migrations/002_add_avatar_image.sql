-- Add User Avatar Image Tables
-- 002_add_avatar_image.sql

-- 1. Create user_avatar_images table
CREATE TABLE user_avatar_images (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    base_object_key VARCHAR(500) NOT NULL,
    original_size INTEGER NOT NULL,
    original_mime_type VARCHAR(50) NOT NULL,
    processing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_user_avatar_images_original_size_positive CHECK (original_size > 0),
    CONSTRAINT ck_user_avatar_images_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes for user_avatar_images
CREATE INDEX idx_user_avatar_images_user_id ON user_avatar_images(user_id);
CREATE INDEX idx_user_avatar_images_processing_status ON user_avatar_images(processing_status);

-- Trigger for user_avatar_images updated_at
CREATE TRIGGER trigger_user_avatar_images_updated_at
    BEFORE UPDATE ON user_avatar_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for user_avatar_images
COMMENT ON TABLE user_avatar_images IS 'User avatar image metadata for Sharp.js processing';
COMMENT ON COLUMN user_avatar_images.processing_status IS 'Processing status: pending, processing, completed, failed';

-- 2. Create user_avatar_variants table
CREATE TABLE user_avatar_variants (
    id SERIAL PRIMARY KEY,
    user_avatar_image_id INTEGER NOT NULL REFERENCES user_avatar_images(id) ON DELETE CASCADE,
    size_type VARCHAR(20) NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_avatar_variants_unique UNIQUE (user_avatar_image_id, size_type),
    CONSTRAINT ck_user_avatar_variants_size_type CHECK (size_type IN ('avatar_32', 'avatar_64', 'avatar_128', 'avatar_256')),
    CONSTRAINT ck_user_avatar_variants_dimensions_positive CHECK (width > 0 AND height > 0),
    CONSTRAINT ck_user_avatar_variants_file_size_positive CHECK (file_size > 0)
);

-- Indexes for user_avatar_variants
CREATE INDEX idx_user_avatar_variants_user_avatar_image_id ON user_avatar_variants(user_avatar_image_id);
CREATE INDEX idx_user_avatar_variants_size_type ON user_avatar_variants(user_avatar_image_id, size_type);

-- Comments for user_avatar_variants
COMMENT ON TABLE user_avatar_variants IS 'User avatar image variants (different sizes)';
COMMENT ON COLUMN user_avatar_variants.size_type IS 'Size type: avatar_32, avatar_64, avatar_128, avatar_256';

-- 3. Add avatar_image_id column to users table
ALTER TABLE users ADD COLUMN avatar_image_id INTEGER;

-- Add foreign key constraint for users.avatar_image_id
ALTER TABLE users ADD CONSTRAINT fk_users_avatar_image_id 
    FOREIGN KEY (avatar_image_id) REFERENCES user_avatar_images(id) ON DELETE SET NULL;

-- Index for users.avatar_image_id
CREATE INDEX idx_users_avatar_image_id ON users(avatar_image_id);

-- Comment for users.avatar_image_id
COMMENT ON COLUMN users.avatar_image_id IS 'Reference to user avatar image';

-- 4. Update v_image_processing_status view to include user avatars
DROP VIEW IF EXISTS v_image_processing_status;
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
GROUP BY ii.id
UNION ALL
SELECT
    'user_avatar_images' as image_type,
    uai.id,
    uai.user_id as parent_id,
    uai.original_filename,
    uai.processing_status,
    uai.created_at,
    COUNT(uav.id) as generated_variants,
    CASE
        WHEN COUNT(uav.id) = 4 THEN 'complete' -- 4 avatar sizes
        WHEN COUNT(uav.id) > 0 THEN 'partial'
        ELSE 'none'
    END as variant_status
FROM user_avatar_images uai
LEFT JOIN user_avatar_variants uav ON uai.id = uav.user_avatar_image_id
GROUP BY uai.id;

COMMENT ON VIEW v_image_processing_status IS 'View to monitor image processing status including user avatars';

-- 5. Create avatar-specific functions
CREATE OR REPLACE FUNCTION find_orphaned_avatar_images()
RETURNS TABLE(image_id INTEGER, filename TEXT, user_id INTEGER, created_at TIMESTAMP, total_file_size BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        uai.id,
        uai.original_filename,
        uai.user_id,
        uai.created_at,
        COALESCE(SUM(uav.file_size), 0) as total_file_size
    FROM user_avatar_images uai
    LEFT JOIN users u ON uai.id = u.avatar_image_id
    LEFT JOIN user_avatar_variants uav ON uai.id = uav.user_avatar_image_id
    WHERE u.id IS NULL -- Not referenced by any user
    GROUP BY uai.id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_orphaned_avatar_images() IS 'Finds user avatar images that are not referenced by any user';

-- 6. Update image processing progress function
DROP FUNCTION IF EXISTS get_image_processing_progress();
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
    FROM item_images
    UNION ALL
    SELECT
        'user_avatar_images'::TEXT,
        COUNT(*) FILTER (WHERE processing_status = 'pending'),
        COUNT(*) FILTER (WHERE processing_status = 'processing'),
        COUNT(*) FILTER (WHERE processing_status = 'completed'),
        COUNT(*) FILTER (WHERE processing_status = 'failed'),
        COUNT(*),
        CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE processing_status = 'completed') * 100.0 / COUNT(*), 2) ELSE 0 END
    FROM user_avatar_images;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_image_processing_progress() IS 'Get progress statistics for image processing including user avatars';

-- 7. Update retry failed processing function
DROP FUNCTION IF EXISTS retry_failed_image_processing();
CREATE OR REPLACE FUNCTION retry_failed_image_processing()
RETURNS TABLE(image_type TEXT, image_id INTEGER, filename TEXT) AS $$
BEGIN
    UPDATE gacha_images SET processing_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE processing_status = 'failed';
    UPDATE item_images SET processing_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE processing_status = 'failed';
    UPDATE user_avatar_images SET processing_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE processing_status = 'failed';
    
    RETURN QUERY
    SELECT 'gacha_images'::TEXT, gi.id, gi.original_filename FROM gacha_images gi WHERE gi.processing_status = 'pending'
    UNION ALL
    SELECT 'item_images'::TEXT, ii.id, ii.original_filename FROM item_images ii WHERE ii.processing_status = 'pending'
    UNION ALL
    SELECT 'user_avatar_images'::TEXT, uai.id, uai.original_filename FROM user_avatar_images uai WHERE uai.processing_status = 'pending';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION retry_failed_image_processing() IS 'Resets failed image processing jobs to pending including user avatars';
