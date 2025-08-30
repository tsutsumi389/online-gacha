-- Migration: Add Analytics and User Preference Tables
-- Date: 2024-08-30
-- Description: Add tables for gacha analytics and user preference features

-- 1. gacha_statistics（ガチャ統計）
CREATE TABLE gacha_statistics (
  id SERIAL PRIMARY KEY,
  gacha_id INTEGER NOT NULL REFERENCES gachas(id) ON DELETE CASCADE,
  total_draws INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  total_revenue BIGINT NOT NULL DEFAULT 0,
  avg_draws_per_user DECIMAL(10,2),
  most_popular_item_id INTEGER REFERENCES gacha_items(id),
  -- デモグラフィック統計
  male_users INTEGER NOT NULL DEFAULT 0,
  female_users INTEGER NOT NULL DEFAULT 0,
  other_gender_users INTEGER NOT NULL DEFAULT 0,
  unknown_gender_users INTEGER NOT NULL DEFAULT 0,
  avg_user_age DECIMAL(4,2),
  age_10s_users INTEGER NOT NULL DEFAULT 0,
  age_20s_users INTEGER NOT NULL DEFAULT 0,
  age_30s_users INTEGER NOT NULL DEFAULT 0,
  age_40s_users INTEGER NOT NULL DEFAULT 0,
  age_50s_users INTEGER NOT NULL DEFAULT 0,
  age_60plus_users INTEGER NOT NULL DEFAULT 0,
  unknown_age_users INTEGER NOT NULL DEFAULT 0,
  last_calculated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gacha_statistics_gacha_id ON gacha_statistics(gacha_id);
CREATE INDEX idx_gacha_statistics_total_draws ON gacha_statistics(total_draws);

-- 2. user_activity_logs（ユーザー行動ログ）
CREATE TABLE user_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'view_gacha', 'draw_gacha', 'favorite_gacha', 'share_gacha'
  gacha_id INTEGER REFERENCES gachas(id) ON DELETE CASCADE,
  gacha_item_id INTEGER REFERENCES gacha_items(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_gacha_id ON user_activity_logs(gacha_id);
CREATE INDEX idx_user_activity_logs_action_type ON user_activity_logs(action_type);
CREATE INDEX idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- 3. gacha_hourly_stats（時間別統計）
CREATE TABLE gacha_hourly_stats (
  id SERIAL PRIMARY KEY,
  gacha_id INTEGER NOT NULL REFERENCES gachas(id) ON DELETE CASCADE,
  hour_bucket TIMESTAMP NOT NULL, -- 1時間単位での集計
  draws_count INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  revenue BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(gacha_id, hour_bucket)
);

CREATE INDEX idx_gacha_hourly_stats_gacha_id ON gacha_hourly_stats(gacha_id);
CREATE INDEX idx_gacha_hourly_stats_hour_bucket ON gacha_hourly_stats(hour_bucket);

-- 4. user_preferences（ユーザー設定）
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  sort_preference VARCHAR(50) NOT NULL DEFAULT 'newest', -- 'newest', 'oldest', 'popular', 'price_low', 'price_high', 'personalized'
  theme_preference VARCHAR(20) DEFAULT 'light', -- 'light', 'dark', 'auto'
  notification_enabled BOOLEAN NOT NULL DEFAULT true,
  language VARCHAR(10) DEFAULT 'ja',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- 5. gacha_categories（ガチャカテゴリ）
CREATE TABLE gacha_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gacha_categories_name ON gacha_categories(name);

-- 6. user_interest_categories（ユーザー興味カテゴリ）
CREATE TABLE user_interest_categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES gacha_categories(id) ON DELETE CASCADE,
  interest_level INTEGER NOT NULL DEFAULT 1 CHECK (interest_level >= 1 AND interest_level <= 5),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category_id)
);

CREATE INDEX idx_user_interest_categories_user_id ON user_interest_categories(user_id);
CREATE INDEX idx_user_interest_categories_category_id ON user_interest_categories(category_id);

-- 7. gacha_category_mappings（ガチャカテゴリマッピング）
CREATE TABLE gacha_category_mappings (
  id SERIAL PRIMARY KEY,
  gacha_id INTEGER NOT NULL REFERENCES gachas(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES gacha_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(gacha_id, category_id)
);

CREATE INDEX idx_gacha_category_mappings_gacha_id ON gacha_category_mappings(gacha_id);
CREATE INDEX idx_gacha_category_mappings_category_id ON gacha_category_mappings(category_id);

-- 8. gacha_demographic_stats（ガチャデモグラフィック統計）
CREATE TABLE gacha_demographic_stats (
  id SERIAL PRIMARY KEY,
  gacha_id INTEGER NOT NULL REFERENCES gachas(id) ON DELETE CASCADE,
  date_bucket DATE NOT NULL, -- 日別集計
  gender VARCHAR(10),
  age_group VARCHAR(10),
  draws_count INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  revenue BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(gacha_id, date_bucket, gender, age_group),
  CHECK (gender IN ('male', 'female', 'other', 'unknown')),
  CHECK (age_group IN ('10s', '20s', '30s', '40s', '50s', '60plus', 'unknown'))
);

CREATE INDEX idx_gacha_demographic_stats_gacha_id ON gacha_demographic_stats(gacha_id);
CREATE INDEX idx_gacha_demographic_stats_date_bucket ON gacha_demographic_stats(date_bucket);
CREATE INDEX idx_gacha_demographic_stats_gender ON gacha_demographic_stats(gender);
CREATE INDEX idx_gacha_demographic_stats_age_group ON gacha_demographic_stats(age_group);

-- 9. user_gacha_ratings（ユーザーガチャ評価）
CREATE TABLE user_gacha_ratings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gacha_id INTEGER NOT NULL REFERENCES gachas(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, gacha_id)
);

CREATE INDEX idx_user_gacha_ratings_user_id ON user_gacha_ratings(user_id);
CREATE INDEX idx_user_gacha_ratings_gacha_id ON user_gacha_ratings(gacha_id);
CREATE INDEX idx_user_gacha_ratings_rating ON user_gacha_ratings(rating);
CREATE INDEX idx_user_gacha_ratings_is_favorite ON user_gacha_ratings(is_favorite);

-- Add updated_at trigger for tables that need it
CREATE TRIGGER trigger_gacha_statistics_updated_at
    BEFORE UPDATE ON gacha_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_gacha_ratings_updated_at
    BEFORE UPDATE ON user_gacha_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE gacha_statistics IS 'ガチャごとの統計情報（リアルタイム＋バッチ更新）';
COMMENT ON TABLE user_activity_logs IS 'ユーザーの行動ログ（閲覧、抽選、お気に入り等）';
COMMENT ON TABLE gacha_hourly_stats IS '時間別のガチャ統計（1時間毎の集計）';
COMMENT ON TABLE user_preferences IS 'ユーザーの個人設定（表示順、テーマ等）';
COMMENT ON TABLE gacha_categories IS 'ガチャのカテゴリマスタ';
COMMENT ON TABLE user_interest_categories IS 'ユーザーの興味カテゴリと興味レベル';
COMMENT ON TABLE gacha_category_mappings IS 'ガチャとカテゴリの多対多関係';
COMMENT ON TABLE gacha_demographic_stats IS 'デモグラフィック別のガチャ統計（日別集計）';
COMMENT ON TABLE user_gacha_ratings IS 'ユーザーのガチャ評価とレビュー';