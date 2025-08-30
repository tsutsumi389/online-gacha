# ガチャ分析・趣味嗜好機能仕様書

## 概要
ガチャを引いている人の分析機能と、ユーザーの趣味嗜好に基づくガチャ一覧の表示順変更機能を追加する。

## 機能要求

### 1. ガチャ分析機能
- ガチャごとの統計情報の表示
- ユーザー行動の分析とレポート
- 時間別・期間別の利用状況分析
- 男女比・年齢別の利用者分析
- デモグラフィック別の収益分析

### 2. ユーザー趣味嗜好機能
- ユーザー設定による表示順のカスタマイズ
- カテゴリベースのフィルタリング
- パーソナライズされた推薦システム

## データベース設計

### 新規テーブル

#### 1. gacha_statistics（ガチャ統計）
```sql
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
```

#### 2. user_activity_logs（ユーザー行動ログ）
```sql
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
```

#### 3. gacha_hourly_stats（時間別統計）
```sql
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
```

#### 4. user_preferences（ユーザー設定）
```sql
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
```

#### 5. gacha_categories（ガチャカテゴリ）
```sql
CREATE TABLE gacha_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gacha_categories_name ON gacha_categories(name);
```

#### 6. user_interest_categories（ユーザー興味カテゴリ）
```sql
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
```

#### 7. gacha_category_mappings（ガチャカテゴリマッピング）
```sql
CREATE TABLE gacha_category_mappings (
  id SERIAL PRIMARY KEY,
  gacha_id INTEGER NOT NULL REFERENCES gachas(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES gacha_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(gacha_id, category_id)
);

CREATE INDEX idx_gacha_category_mappings_gacha_id ON gacha_category_mappings(gacha_id);
CREATE INDEX idx_gacha_category_mappings_category_id ON gacha_category_mappings(category_id);
```

#### 8. gacha_demographic_stats（ガチャデモグラフィック統計）
```sql
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
```

#### 9. user_gacha_ratings（ユーザーガチャ評価）
```sql
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
```

### 既存テーブルの拡張

#### usersテーブル
```sql
ALTER TABLE users ADD COLUMN total_draws INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN signup_source VARCHAR(50);
-- デモグラフィック情報
ALTER TABLE users ADD COLUMN gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
ALTER TABLE users ADD COLUMN birth_year INTEGER CHECK (birth_year >= 1900 AND birth_year <= EXTRACT(YEAR FROM CURRENT_DATE));
ALTER TABLE users ADD COLUMN age_group VARCHAR(10) GENERATED ALWAYS AS (
  CASE 
    WHEN birth_year IS NULL THEN 'unknown'
    WHEN EXTRACT(YEAR FROM CURRENT_DATE) - birth_year < 20 THEN '10s'
    WHEN EXTRACT(YEAR FROM CURRENT_DATE) - birth_year < 30 THEN '20s'
    WHEN EXTRACT(YEAR FROM CURRENT_DATE) - birth_year < 40 THEN '30s'
    WHEN EXTRACT(YEAR FROM CURRENT_DATE) - birth_year < 50 THEN '40s'
    WHEN EXTRACT(YEAR FROM CURRENT_DATE) - birth_year < 60 THEN '50s'
    ELSE '60plus'
  END
) STORED;

CREATE INDEX idx_users_total_draws ON users(total_draws);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);
CREATE INDEX idx_users_gender ON users(gender);
CREATE INDEX idx_users_age_group ON users(age_group);
CREATE INDEX idx_users_birth_year ON users(birth_year);
```

## API設計

### 1. ガチャ分析API

#### GET /api/admin/gacha-analytics/:id
ガチャの詳細分析データを取得
```json
{
  "data": {
    "gacha_id": 1,
    "statistics": {
      "total_draws": 1500,
      "unique_users": 230,
      "total_revenue": 150000,
      "avg_draws_per_user": 6.52,
      "most_popular_item": {
        "id": 15,
        "name": "レアアイテム"
      }
    },
    "hourly_stats": [
      {
        "hour": "2024-01-01T09:00:00Z",
        "draws_count": 45,
        "unique_users": 12,
        "revenue": 4500
      }
    ],
    "demographics": {
      "gender_breakdown": {
        "male": 120,
        "female": 95,
        "other": 10,
        "unknown": 5
      },
      "age_breakdown": {
        "10s": 25,
        "20s": 85,
        "30s": 70,
        "40s": 35,
        "50s": 15,
        "60plus": 5,
        "unknown": 10
      },
      "avg_age": 28.5,
      "gender_revenue": {
        "male": 65000,
        "female": 78000,
        "other": 5500,
        "unknown": 1500
      },
      "age_revenue": {
        "10s": 8000,
        "20s": 55000,
        "30s": 62000,
        "40s": 20000,
        "50s": 4500,
        "60plus": 500
      }
    },
    "user_demographics": {
      "new_users": 45,
      "returning_users": 185
    }
  }
}
```

#### GET /api/admin/analytics/dashboard
全体ダッシュボード用の統計データ
```json
{
  "data": {
    "total_gachas": 25,
    "total_draws": 15000,
    "total_users": 850,
    "revenue_summary": {
      "today": 25000,
      "this_week": 175000,
      "this_month": 650000
    },
    "popular_gachas": [
      {
        "id": 1,
        "name": "人気ガチャ",
        "total_draws": 2500,
        "ranking": 1
      }
    ]
  }
}
```

### 2. ユーザー趣味嗜好API

#### GET /api/user/preferences
ユーザー設定を取得
```json
{
  "data": {
    "sort_preference": "personalized",
    "theme_preference": "dark",
    "notification_enabled": true,
    "language": "ja",
    "interest_categories": [
      {
        "category_id": 1,
        "category_name": "アニメ",
        "interest_level": 5
      }
    ]
  }
}
```

#### PUT /api/user/preferences
ユーザー設定を更新
```json
{
  "sort_preference": "popular",
  "theme_preference": "light",
  "interest_categories": [
    {
      "category_id": 1,
      "interest_level": 4
    }
  ]
}
```

#### GET /api/gachas?sort=:sortType&category=:categoryId&page=:page
カスタマイズされたガチャ一覧を取得
```json
{
  "data": [
    {
      "id": 1,
      "name": "おすすめガチャ",
      "personalization_score": 8.5,
      "category": "アニメ",
      "total_draws": 1500,
      "average_rating": 4.2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25
  }
}
```

#### POST /api/user/gacha-rating
ガチャの評価を投稿
```json
{
  "gacha_id": 1,
  "rating": 5,
  "review": "とても楽しいガチャでした！",
  "is_favorite": true
}
```

## フロントエンド実装

### 1. ガチャ分析画面（管理者向け）
- **場所**: `/admin/analytics`
- **コンポーネント**: `GachaAnalyticsDashboard.jsx`
- **機能**:
  - 全体統計の表示
  - ガチャ別詳細分析
  - 時間別グラフ表示
  - ユーザー行動分析
  - **男女比グラフ表示**
  - **年齢別分布グラフ**
  - **デモグラフィック別収益分析**

### 2. ユーザー設定画面
- **場所**: `/profile/preferences`
- **コンポーネント**: `UserPreferences.jsx`
- **機能**:
  - 表示順設定
  - 興味カテゴリ設定
  - テーマ設定

### 3. パーソナライズされたガチャ一覧
- **場所**: `/gacha`（既存の拡張）
- **コンポーネント**: `GachaList.jsx`（既存の拡張）
- **機能**:
  - ソート機能の拡張
  - カテゴリフィルター
  - 個人化スコア表示

## バックエンド実装

### 1. 分析モデル（Analytics.js）
```javascript
class Analytics {
  static async getGachaStatistics(gachaId) {
    // ガチャ統計データを取得・計算
  }
  
  static async updateHourlyStats() {
    // 時間別統計を更新（1時間毎のcron実行）
  }
  
  static async updateDemographicStats() {
    // デモグラフィック統計を更新（1時間毎のバッチ処理）
    // gacha_statisticsのデモグラフィック項目を更新
  }
  
  static async updateBasicStatsRealtime(gachaId, userId) {
    // リアルタイム統計更新（ガチャ抽選時）
    // total_draws, unique_users, total_revenue, most_popular_item_idを即座に更新
  }
  
  static async getGenderAgeBreakdown(gachaId, dateRange) {
    // 男女比・年齢別分布データを取得
  }
  
  static async calculatePersonalizationScore(userId, gachaId) {
    // パーソナライゼーションスコアを計算
  }
}
```

### 2. 推薦システム（RecommendationEngine.js）
```javascript
class RecommendationEngine {
  static async getPersonalizedGachas(userId, options = {}) {
    // ユーザーの趣味嗜好に基づくガチャ推薦
  }
  
  static async updateUserInterestProfile(userId) {
    // ユーザーの行動履歴から興味プロファイルを更新
  }
}
```

### 3. 活動ログミドルウェア
```javascript
const logUserActivity = (actionType) => {
  return async (request, reply) => {
    // ユーザーの行動をログに記録
    await UserActivityLog.create({
      user_id: request.user.id,
      action_type: actionType,
      gacha_id: request.params.id,
      session_id: request.sessionId,
      ip_address: request.ip,
      user_agent: request.headers['user-agent']
    });
    
    // ガチャ抽選時はリアルタイム統計更新
    if (actionType === 'draw_gacha') {
      await Analytics.updateBasicStatsRealtime(request.params.id, request.user.id);
    }
  };
};
```

## 実装段階

### Phase 1: データベーススキーマ
1. 新規テーブルの作成
   - gacha_statisticsテーブル（デモグラフィックカラム含む）
   - gacha_demographic_statsテーブル
   - user_activity_logsテーブル
2. 既存テーブルの拡張
   - usersテーブルにgender, birth_year, age_group追加
   - gachasテーブルに統計カラム追加
3. インデックスの追加
4. マイグレーションスクリプト作成

### Phase 2: バックエンドAPI
1. 分析API実装
2. ユーザー設定API実装
3. 推薦システム実装
4. 活動ログシステム実装
5. **ハイブリッド統計更新システム実装**
   - リアルタイム統計更新機能
   - 1時間每のデモグラフィック統計更新

### Phase 3: フロントエンド
1. 管理者分析画面
2. ユーザー設定画面
3. パーソナライズされた一覧画面
4. 評価・お気に入り機能

### Phase 4: 最適化・改善
1. パフォーマンス最適化
2. キャッシュシステム
3. リアルタイム更新
4. A/Bテスト機能

## 統計更新方式（ハイブリッド方式）

### リアルタイム更新
**更新タイミング**: ガチャ抽選時に即座実行
**対象データ**:
- `total_draws`: 総抽選回数 (+1)
- `unique_users`: ユニークユーザー数 (初回抽選時のみ+1)
- `total_revenue`: 総収益 (+ガチャ価格)
- `most_popular_item_id`: 最人気アイテム更新
- `last_draw_at`: 最終抽選日時

### バッチ更新（1時間毎）
**更新タイミング**: cronジョブで毎時正に実行
**対象データ**:
- `male_users`, `female_users`, `other_gender_users`, `unknown_gender_users`
- `age_10s_users`, `age_20s_users`, `age_30s_users`, `age_40s_users`, `age_50s_users`, `age_60plus_users`, `unknown_age_users`
- `avg_user_age`: 平均年齢
- `avg_draws_per_user`: ユーザーあたり平均抽選回数

### cron設定
```bash
# 1時間毎のデモグラフィック統計更新
0 * * * * /usr/local/bin/node /path/to/update-demographic-stats.js

# 時間別統計テーブルの更新
0 * * * * /usr/local/bin/node /path/to/update-hourly-stats.js
```

## パフォーマンス考慮事項

### 1. データベース最適化
- 適切なインデックスの設定
- 統計データの事前計算
- パーティショニング（履歴データ）
- **リアルタイム更新時のデッドロック回避**

### 2. キャッシュ戦略
- Redis によるセッションキャッシュ
- 統計データのメモリキャッシュ
- CDN による静的リソースキャッシュ

### 3. 非同期処理
- バックグラウンドでの統計計算
- ユーザー行動ログの非同期書き込み
- 推薦スコアの定期更新

## セキュリティ考慮事項

### 1. プライバシー保護
- 個人識別情報の匿名化
- ユーザー同意の取得
- データ保持期間の設定

### 2. アクセス制御
- 管理者機能の適切な権限制御
- ユーザーデータの適切なスコープ制限
- API レート制限

### 3. データ整合性
- トランザクション管理
- データバリデーション
- 異常値検出と対処