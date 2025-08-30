-- Analytics and User Preference Seed Data
-- This file adds sample data for the new analytics tables

-- Clear existing analytics data
TRUNCATE TABLE user_gacha_ratings CASCADE;
TRUNCATE TABLE gacha_category_mappings CASCADE;
TRUNCATE TABLE user_interest_categories CASCADE;
TRUNCATE TABLE gacha_categories CASCADE;
TRUNCATE TABLE user_preferences CASCADE;
TRUNCATE TABLE user_activity_logs CASCADE;
TRUNCATE TABLE gacha_demographic_stats CASCADE;
TRUNCATE TABLE gacha_hourly_stats CASCADE;
TRUNCATE TABLE gacha_statistics CASCADE;

-- Update existing users with demographic information
UPDATE users SET 
  gender = 'male',
  birth_year = 1995,
  total_draws = 15,
  last_login_at = NOW() - INTERVAL '1 hour',
  signup_source = 'google'
WHERE id = 1;

UPDATE users SET 
  gender = 'female', 
  birth_year = 1988,
  total_draws = 8,
  last_login_at = NOW() - INTERVAL '2 days',
  signup_source = 'twitter'
WHERE id = 2;

-- Insert additional sample users with diverse demographics
INSERT INTO users (id, name, email, password_hash, gender, birth_year, total_draws, last_login_at, signup_source, created_at, updated_at) VALUES
(3, 'Young User', 'young@example.com', '$2b$12$VXkLzNZjHbYGK6pRWz/n5eIE0a4KFR1uEJ.nBNKKYyf7p7PZGw7/a', 'other', 2008, 25, NOW() - INTERVAL '30 minutes', 'direct', NOW(), NOW()),
(4, 'Senior User', 'senior@example.com', '$2b$12$VXkLzNZjHbYGK6pRWz/n5eIE0a4KFR1uEJ.nBNKKYyf7p7PZGw7/a', 'female', 1965, 5, NOW() - INTERVAL '1 day', 'facebook', NOW(), NOW()),
(5, 'Anonymous User', 'anon@example.com', '$2b$12$VXkLzNZjHbYGK6pRWz/n5eIE0a4KFR1uEJ.nBNKKYyf7p7PZGw7/a', NULL, NULL, 12, NOW() - INTERVAL '6 hours', 'advertisement', NOW(), NOW());

-- Reset sequence for users table
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Insert gacha categories
INSERT INTO gacha_categories (id, name, description, created_at) VALUES
(1, 'アニメ', 'アニメキャラクターやグッズのガチャ', NOW()),
(2, 'ゲーム', 'ゲーム関連アイテムのガチャ', NOW()),
(3, 'キャラクター', 'オリジナルキャラクターのガチャ', NOW()),
(4, 'スポーツ', 'スポーツ関連のガチャ', NOW()),
(5, '音楽', '音楽・アーティスト関連のガチャ', NOW());

-- Reset sequence for gacha_categories
SELECT setval('gacha_categories_id_seq', (SELECT MAX(id) FROM gacha_categories));

-- Map gachas to categories (many-to-many relationship)
INSERT INTO gacha_category_mappings (gacha_id, category_id, created_at) VALUES
(1, 1, NOW()), -- Beginner Gacha -> アニメ
(1, 3, NOW()), -- Beginner Gacha -> キャラクター
(2, 2, NOW()), -- Premium Gacha -> ゲーム
(2, 3, NOW()), -- Premium Gacha -> キャラクター
(3, 4, NOW()); -- User 2 Gacha -> スポーツ

-- Insert user preferences
INSERT INTO user_preferences (user_id, sort_preference, theme_preference, notification_enabled, language, created_at, updated_at) VALUES
(1, 'personalized', 'dark', TRUE, 'ja', NOW(), NOW()),
(2, 'popular', 'light', TRUE, 'ja', NOW(), NOW()),
(3, 'newest', 'auto', FALSE, 'ja', NOW(), NOW()),
(4, 'price_low', 'light', TRUE, 'ja', NOW(), NOW()),
(5, 'newest', 'dark', FALSE, 'en', NOW(), NOW());

-- Insert user interest categories
INSERT INTO user_interest_categories (user_id, category_id, interest_level, created_at) VALUES
(1, 1, 5, NOW()), -- User 1 -> アニメ (大好き)
(1, 2, 4, NOW()), -- User 1 -> ゲーム (好き)
(1, 3, 3, NOW()), -- User 1 -> キャラクター (普通)
(2, 3, 5, NOW()), -- User 2 -> キャラクター (大好き)
(2, 4, 2, NOW()), -- User 2 -> スポーツ (あまり興味なし)
(3, 1, 5, NOW()), -- User 3 -> アニメ (大好き)
(3, 5, 4, NOW()), -- User 3 -> 音楽 (好き)
(4, 4, 3, NOW()), -- User 4 -> スポーツ (普通)
(5, 2, 4, NOW()); -- User 5 -> ゲーム (好き)

-- Insert user activity logs (sample activity over the past week)
INSERT INTO user_activity_logs (user_id, action_type, gacha_id, gacha_item_id, session_id, ip_address, user_agent, created_at) VALUES
-- User 1 activities
(1, 'view_gacha', 1, NULL, 'sess_1_001', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '1 day'),
(1, 'draw_gacha', 1, 1, 'sess_1_001', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '1 day'),
(1, 'draw_gacha', 1, 2, 'sess_1_002', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '6 hours'),
(1, 'view_gacha', 2, NULL, 'sess_1_003', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '2 hours'),
-- User 2 activities  
(2, 'view_gacha', 3, NULL, 'sess_2_001', '10.0.0.5', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15', NOW() - INTERVAL '2 days'),
(2, 'draw_gacha', 3, 7, 'sess_2_001', '10.0.0.5', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15', NOW() - INTERVAL '2 days'),
(2, 'favorite_gacha', 3, NULL, 'sess_2_001', '10.0.0.5', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15', NOW() - INTERVAL '2 days'),
-- User 3 activities
(3, 'view_gacha', 1, NULL, 'sess_3_001', '172.16.0.10', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '3 hours'),
(3, 'view_gacha', 2, NULL, 'sess_3_001', '172.16.0.10', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '3 hours'),
(3, 'draw_gacha', 2, 4, 'sess_3_001', '172.16.0.10', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '2 hours');

-- Insert user gacha ratings
INSERT INTO user_gacha_ratings (user_id, gacha_id, rating, review, is_favorite, created_at, updated_at) VALUES
(1, 1, 4, '初心者向けで良いガチャです！', TRUE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(1, 2, 5, '本当に素晴らしいレアアイテムが出ました！', TRUE, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
(2, 3, 5, '自分で作ったガチャですが気に入ってます', TRUE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(2, 1, 3, 'まあまあでした', FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(3, 2, 4, '面白いアイテムが多い', FALSE, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
(4, 1, 2, 'あまり私の趣味ではありませんでした', FALSE, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

-- Insert gacha statistics (pre-calculated for demonstration)
INSERT INTO gacha_statistics (gacha_id, total_draws, unique_users, total_revenue, avg_draws_per_user, most_popular_item_id,
  male_users, female_users, other_gender_users, unknown_gender_users,
  avg_user_age, age_10s_users, age_20s_users, age_30s_users, age_40s_users, age_50s_users, age_60plus_users, unknown_age_users,
  last_calculated, created_at, updated_at) VALUES
(1, 45, 12, 4500, 3.75, 1,
  6, 4, 1, 1,
  28.5, 1, 8, 2, 1, 0, 0, 0,
  NOW(), NOW(), NOW()),
(2, 28, 8, 14000, 3.5, 4,
  3, 3, 1, 1,
  25.2, 2, 4, 1, 1, 0, 0, 0,
  NOW(), NOW(), NOW()),
(3, 12, 3, 2400, 4.0, 7,
  1, 2, 0, 0,
  32.0, 0, 2, 1, 0, 0, 0, 0,
  NOW(), NOW(), NOW());

-- Insert hourly stats (sample data for the past 24 hours)
INSERT INTO gacha_hourly_stats (gacha_id, hour_bucket, draws_count, unique_users, revenue, created_at) VALUES
(1, DATE_TRUNC('hour', NOW() - INTERVAL '24 hours'), 5, 3, 500, NOW()),
(1, DATE_TRUNC('hour', NOW() - INTERVAL '23 hours'), 3, 2, 300, NOW()),
(1, DATE_TRUNC('hour', NOW() - INTERVAL '6 hours'), 8, 4, 800, NOW()),
(1, DATE_TRUNC('hour', NOW() - INTERVAL '2 hours'), 6, 3, 600, NOW()),
(2, DATE_TRUNC('hour', NOW() - INTERVAL '12 hours'), 4, 2, 2000, NOW()),
(2, DATE_TRUNC('hour', NOW() - INTERVAL '8 hours'), 7, 3, 3500, NOW()),
(2, DATE_TRUNC('hour', NOW() - INTERVAL '3 hours'), 3, 2, 1500, NOW()),
(3, DATE_TRUNC('hour', NOW() - INTERVAL '18 hours'), 2, 1, 400, NOW()),
(3, DATE_TRUNC('hour', NOW() - INTERVAL '6 hours'), 1, 1, 200, NOW());

-- Insert demographic stats (sample data for the past week)
INSERT INTO gacha_demographic_stats (gacha_id, date_bucket, gender, age_group, draws_count, unique_users, revenue, created_at) VALUES
-- Gacha 1 stats
(1, CURRENT_DATE - INTERVAL '1 day', 'male', '20s', 15, 4, 1500, NOW()),
(1, CURRENT_DATE - INTERVAL '1 day', 'female', '30s', 8, 2, 800, NOW()),
(1, CURRENT_DATE - INTERVAL '1 day', 'other', '10s', 5, 1, 500, NOW()),
(1, CURRENT_DATE, 'male', '20s', 12, 3, 1200, NOW()),
(1, CURRENT_DATE, 'female', '30s', 5, 2, 500, NOW()),
-- Gacha 2 stats
(2, CURRENT_DATE - INTERVAL '1 day', 'male', '20s', 8, 2, 4000, NOW()),
(2, CURRENT_DATE - INTERVAL '1 day', 'female', '20s', 6, 2, 3000, NOW()),
(2, CURRENT_DATE, 'male', '30s', 4, 1, 2000, NOW()),
(2, CURRENT_DATE, 'other', '10s', 3, 1, 1500, NOW()),
-- Gacha 3 stats
(3, CURRENT_DATE - INTERVAL '2 days', 'female', '30s', 8, 1, 1600, NOW()),
(3, CURRENT_DATE - INTERVAL '1 day', 'male', '20s', 2, 1, 400, NOW()),
(3, CURRENT_DATE, 'female', '20s', 2, 1, 400, NOW());

-- Reset all sequences to ensure proper ID generation
SELECT setval('gacha_statistics_id_seq', (SELECT MAX(id) FROM gacha_statistics));
SELECT setval('user_activity_logs_id_seq', (SELECT MAX(id) FROM user_activity_logs));
SELECT setval('gacha_hourly_stats_id_seq', (SELECT MAX(id) FROM gacha_hourly_stats));
SELECT setval('user_preferences_id_seq', (SELECT MAX(id) FROM user_preferences));
SELECT setval('user_interest_categories_id_seq', (SELECT MAX(id) FROM user_interest_categories));
SELECT setval('gacha_category_mappings_id_seq', (SELECT MAX(id) FROM gacha_category_mappings));
SELECT setval('gacha_demographic_stats_id_seq', (SELECT MAX(id) FROM gacha_demographic_stats));
SELECT setval('user_gacha_ratings_id_seq', (SELECT MAX(id) FROM user_gacha_ratings));

COMMIT;