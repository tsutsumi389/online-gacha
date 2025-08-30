-- Migration: Extend Users Table for Analytics
-- Date: 2024-08-30
-- Description: Add demographic and analytics columns to users table

-- Extend users table with analytics and demographic information
ALTER TABLE users ADD COLUMN total_draws INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN signup_source VARCHAR(50);

-- デモグラフィック情報
ALTER TABLE users ADD COLUMN gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
ALTER TABLE users ADD COLUMN birth_year INTEGER CHECK (birth_year >= 1900 AND birth_year <= EXTRACT(YEAR FROM CURRENT_DATE));

-- age_groupカラムは追加せず、VIEWで動的に計算

-- Add indexes for performance
CREATE INDEX idx_users_total_draws ON users(total_draws);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);
CREATE INDEX idx_users_gender ON users(gender);
-- age_groupのインデックスは不要（VIEWで計算）
CREATE INDEX idx_users_birth_year ON users(birth_year);
CREATE INDEX idx_users_signup_source ON users(signup_source);

-- Comments for documentation
COMMENT ON COLUMN users.total_draws IS 'ユーザーの総ガチャ抽選回数（リアルタイム更新）';
COMMENT ON COLUMN users.last_login_at IS '最終ログイン日時';
COMMENT ON COLUMN users.signup_source IS '登録流入元（direct, google, twitter等）';
COMMENT ON COLUMN users.gender IS '性別（male, female, other, prefer_not_to_say）';
COMMENT ON COLUMN users.birth_year IS '生年（西暦）';
-- age_groupはVIEWで提供

-- ユーザー情報を年齢グループ付きで提供するVIEW
CREATE VIEW v_users_with_demographics AS
SELECT 
  u.*,
  CASE 
    WHEN u.birth_year IS NULL THEN 'unknown'
    WHEN EXTRACT(YEAR FROM CURRENT_DATE) - u.birth_year < 20 THEN '10s'
    WHEN EXTRACT(YEAR FROM CURRENT_DATE) - u.birth_year < 30 THEN '20s'
    WHEN EXTRACT(YEAR FROM CURRENT_DATE) - u.birth_year < 40 THEN '30s'
    WHEN EXTRACT(YEAR FROM CURRENT_DATE) - u.birth_year < 50 THEN '40s'
    WHEN EXTRACT(YEAR FROM CURRENT_DATE) - u.birth_year < 60 THEN '50s'
    ELSE '60plus'
  END as age_group,
  CASE 
    WHEN u.birth_year IS NOT NULL THEN EXTRACT(YEAR FROM CURRENT_DATE) - u.birth_year
    ELSE NULL
  END as current_age
FROM users u;

COMMENT ON VIEW v_users_with_demographics IS 'ユーザー情報に年齢グループと現在年齢を動的に計算して提供するVIEW';