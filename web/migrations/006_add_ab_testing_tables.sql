-- A/Bテストフレームワーク用のテーブル

-- A/Bテスト定義テーブル
CREATE TABLE ab_tests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  variants JSONB NOT NULL, -- [{"name": "control", "weight": 50}, {"name": "variant_a", "weight": 50}]
  traffic_allocation INTEGER NOT NULL DEFAULT 100 CHECK (traffic_allocation >= 0 AND traffic_allocation <= 100),
  target_criteria JSONB DEFAULT '{}', -- {"age_group": {"values": ["20s", "30s"]}, "gender": {"values": ["male"]}}
  config JSONB DEFAULT '{}', -- テスト固有の設定
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_ab_tests_name ON ab_tests(name);
CREATE INDEX idx_ab_tests_status ON ab_tests(status);
CREATE INDEX idx_ab_tests_dates ON ab_tests(start_date, end_date);

-- A/Bテストユーザー割り当てテーブル
CREATE TABLE ab_test_assignments (
  id SERIAL PRIMARY KEY,
  test_id INTEGER NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  variant VARCHAR(100) NOT NULL,
  user_context JSONB DEFAULT '{}', -- ユーザーのコンテキスト情報（年齢、性別など）
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(test_id, user_id)
);

CREATE INDEX idx_ab_test_assignments_test_id ON ab_test_assignments(test_id);
CREATE INDEX idx_ab_test_assignments_user_id ON ab_test_assignments(user_id);
CREATE INDEX idx_ab_test_assignments_variant ON ab_test_assignments(test_id, variant);
CREATE INDEX idx_ab_test_assignments_assigned_at ON ab_test_assignments(assigned_at);

-- A/Bテストイベント記録テーブル
CREATE TABLE ab_test_events (
  id SERIAL PRIMARY KEY,
  test_id INTEGER NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'assigned', 'conversion', 'page_view', 'click', etc.
  event_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ab_test_events_test_id ON ab_test_events(test_id);
CREATE INDEX idx_ab_test_events_user_id ON ab_test_events(user_id);
CREATE INDEX idx_ab_test_events_event_type ON ab_test_events(event_type);
CREATE INDEX idx_ab_test_events_timestamp ON ab_test_events(timestamp);

-- A/Bテストコンバージョン集計テーブル
CREATE TABLE ab_test_conversions (
  id SERIAL PRIMARY KEY,
  test_id INTEGER NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant VARCHAR(100) NOT NULL,
  goal_name VARCHAR(100) NOT NULL, -- 'purchase', 'signup', 'gacha_draw', etc.
  conversions INTEGER NOT NULL DEFAULT 0,
  total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(test_id, variant, goal_name)
);

CREATE INDEX idx_ab_test_conversions_test_id ON ab_test_conversions(test_id);
CREATE INDEX idx_ab_test_conversions_variant ON ab_test_conversions(test_id, variant);
CREATE INDEX idx_ab_test_conversions_goal ON ab_test_conversions(goal_name);

-- A/Bテスト結果の統計ビュー
CREATE VIEW v_ab_test_results AS
SELECT 
  t.id as test_id,
  t.name as test_name,
  t.description,
  t.status,
  t.start_date,
  t.end_date,
  a.variant,
  COUNT(a.user_id) as total_users,
  COUNT(a.user_id) * 100.0 / SUM(COUNT(a.user_id)) OVER (PARTITION BY t.id) as user_percentage,
  COALESCE(c.conversions, 0) as total_conversions,
  COALESCE(c.total_value, 0) as total_conversion_value,
  CASE 
    WHEN COUNT(a.user_id) > 0 
    THEN COALESCE(c.conversions, 0) * 100.0 / COUNT(a.user_id)
    ELSE 0 
  END as conversion_rate,
  CASE 
    WHEN COUNT(a.user_id) > 0 
    THEN COALESCE(c.total_value, 0) / COUNT(a.user_id)
    ELSE 0 
  END as avg_value_per_user
FROM ab_tests t
JOIN ab_test_assignments a ON t.id = a.test_id
LEFT JOIN (
  SELECT 
    test_id, 
    variant, 
    SUM(conversions) as conversions,
    SUM(total_value) as total_value
  FROM ab_test_conversions 
  GROUP BY test_id, variant
) c ON t.id = c.test_id AND a.variant = c.variant
GROUP BY t.id, t.name, t.description, t.status, t.start_date, t.end_date, 
         a.variant, c.conversions, c.total_value
ORDER BY t.id, a.variant;

-- A/Bテスト用のトリガー関数（updated_atの自動更新）
CREATE OR REPLACE FUNCTION update_ab_test_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ab_tests_updated_at
  BEFORE UPDATE ON ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_ab_test_updated_at();

CREATE TRIGGER trigger_ab_test_conversions_updated_at
  BEFORE UPDATE ON ab_test_conversions
  FOR EACH ROW
  EXECUTE FUNCTION update_ab_test_updated_at();