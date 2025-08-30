# オンラインガチャシステム テーブル定義（実装版）

## users（ユーザー情報）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | ユーザーID     |
| name             | VARCHAR(64)  | NOT NULL       | ユーザー名     |
| email            | VARCHAR(255) | UNIQUE,NOT NULL| メールアドレス |
| password_hash    | VARCHAR(255) | NOT NULL       | パスワードハッシュ |
| avatar_image_id  | INTEGER      | FOREIGN KEY    | ユーザーアイコン画像ID |
| total_draws      | INTEGER      | NOT NULL, DEFAULT 0 | 総ガチャ抽選回数 |
| last_login_at    | TIMESTAMP    |                | 最終ログイン日時 |
| signup_source    | VARCHAR(50)  |                | 登録流入元 |
| gender           | VARCHAR(10)  | CHECK IN ('male','female','other','prefer_not_to_say') | 性別 |
| birth_year       | INTEGER      | CHECK (1900 <= birth_year <= CURRENT_YEAR) | 生年 |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 登録日時       |
| updated_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新日時       |

**制約**:
- FOREIGN KEY (avatar_image_id) REFERENCES user_avatar_images(id) ON DELETE SET NULL

**インデックス**:
- `idx_users_total_draws` (total_draws)
- `idx_users_last_login_at` (last_login_at)
- `idx_users_gender` (gender)
- `idx_users_birth_year` (birth_year)
- `idx_users_signup_source` (signup_source)
- `idx_users_avatar_image_id` (avatar_image_id)

**注意**: roleカラムは削除されました。すべてのユーザーは同等の権限を持ち、ガチャの作成と実行の両方が可能です。

## gachas（ガチャ情報）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | ガチャID       |
| name             | VARCHAR(128) | NOT NULL       | ガチャ名       |
| description      | TEXT         |                | 説明           |
| price            | INTEGER      | NOT NULL       | 価格（ポイント等）|
| user_id          | INTEGER      | FOREIGN KEY    | 作成者ユーザーID |
| is_public        | BOOLEAN      | NOT NULL, DEFAULT TRUE | 公開/非公開  |
| display_from     | TIMESTAMP    |                | 表示開始日時   |
| display_to       | TIMESTAMP    |                | 表示終了日時   |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時       |
| updated_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新日時       |

## gacha_images（ガチャ画像情報）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | 画像ID         |
| gacha_id         | INTEGER      | FOREIGN KEY (gachas.id) | ガチャID |
| original_filename| VARCHAR(255) | NOT NULL       | 元ファイル名   |
| base_object_key  | VARCHAR(500) | NOT NULL       | ベースオブジェクトキー（拡張子なし） |
| original_size    | INTEGER      | NOT NULL       | 元ファイルサイズ (bytes) |
| original_mime_type| VARCHAR(50) | NOT NULL       | 元MIMEタイプ   |
| display_order    | INTEGER      | NOT NULL DEFAULT 1 | 表示順序 (1が最初) |
| is_main          | BOOLEAN      | NOT NULL DEFAULT FALSE | メイン画像フラグ |
| processing_status| VARCHAR(20)  | NOT NULL DEFAULT 'pending' | 処理状況 (pending/processing/completed/failed) |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新日時 |

**制約**:
- UNIQUE(gacha_id, display_order) : 同一ガチャ内での表示順序の重複を防ぐ
- FOREIGN KEY (gacha_id) REFERENCES gachas(id) ON DELETE CASCADE
- CHECK (display_order > 0) : 表示順序は1以上
- CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))

## image_variants（画像サイズ・フォーマット別管理）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | バリアントID   |
| gacha_image_id   | INTEGER      | FOREIGN KEY (gacha_images.id) | 親画像ID |
| size_type        | VARCHAR(20)  | NOT NULL       | サイズ種別 (original/desktop/mobile/thumbnail) |
| format_type      | VARCHAR(10)  | NOT NULL       | フォーマット (avif/webp/jpeg) |
| object_key       | VARCHAR(500) | NOT NULL       | MinIOオブジェクトキー |
| image_url        | VARCHAR(500) | NOT NULL       | 画像URL (MinIO) |
| file_size        | INTEGER      | NOT NULL       | ファイルサイズ (bytes) |
| width            | INTEGER      | NOT NULL       | 画像幅 (px) |
| height           | INTEGER      | NOT NULL       | 画像高さ (px) |
| quality          | INTEGER      |                | 圧縮品質 (1-100) |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |

**制約**:
- UNIQUE(gacha_image_id, size_type, format_type) : 同一画像の同一サイズ・フォーマットの重複防止
- FOREIGN KEY (gacha_image_id) REFERENCES gacha_images(id) ON DELETE CASCADE
- CHECK (size_type IN ('original', 'desktop', 'mobile', 'thumbnail'))
- CHECK (format_type IN ('avif', 'webp', 'jpeg'))
- CHECK (width > 0 AND height > 0)
- CHECK (file_size > 0)
- CHECK (quality IS NULL OR (quality >= 1 AND quality <= 100))

## gacha_items（ガチャ内の商品情報）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | 商品ID         |
| gacha_id         | INTEGER      | FOREIGN KEY    | ガチャID       |
| name             | VARCHAR(128) | NOT NULL       | 商品名         |
| description      | TEXT         |                | 商品説明       |
| image_url        | VARCHAR(255) |                | 商品画像URL（後方互換性のため残存） |
| item_image_id    | INTEGER      | FOREIGN KEY    | アイテム画像ID（新） |
| stock            | INTEGER      |                | 初期在庫数。この値は不変。 |
| is_public        | BOOLEAN      | NOT NULL, DEFAULT TRUE | 公開/非公開  |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時       |
| updated_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新日時       |

**制約**:
- FOREIGN KEY (gacha_id) REFERENCES gachas(id) ON DELETE CASCADE
- FOREIGN KEY (item_image_id) REFERENCES item_images(id) ON DELETE SET NULL

**注意**: 
- rarityカラムは実装から除外されました。レアリティ機能は現在の仕様には含まれていません。
- item_image_id は新しい画像管理システム用、image_url は後方互換性のため残存

## item_images（アイテム画像情報）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | 画像ID         |
| user_id          | INTEGER      | FOREIGN KEY (users.id) | アップロードユーザーID |
| original_filename| VARCHAR(255) | NOT NULL       | 元ファイル名   |
| base_object_key  | VARCHAR(500) | NOT NULL       | ベースオブジェクトキー（拡張子なし） |
| original_size    | INTEGER      | NOT NULL       | 元ファイルサイズ (bytes) |
| original_mime_type| VARCHAR(50) | NOT NULL       | 元MIMEタイプ   |
| processing_status| VARCHAR(20)  | NOT NULL DEFAULT 'pending' | 処理状況 (pending/processing/completed/failed) |
| is_public        | BOOLEAN      | NOT NULL DEFAULT TRUE | 公開/非公開  |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新日時 |

**制約**:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))

## item_image_variants（アイテム画像サイズ・フォーマット別管理）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | バリアントID   |
| item_image_id    | INTEGER      | FOREIGN KEY (item_images.id) | 親画像ID |
| size_type        | VARCHAR(20)  | NOT NULL       | サイズ種別 (original/desktop/mobile/thumbnail) |
| format_type      | VARCHAR(10)  | NOT NULL       | フォーマット (avif/webp/jpeg) |
| object_key       | VARCHAR(500) | NOT NULL       | MinIOオブジェクトキー |
| image_url        | VARCHAR(500) | NOT NULL       | 画像URL (MinIO) |
| file_size        | INTEGER      | NOT NULL       | ファイルサイズ (bytes) |
| width            | INTEGER      | NOT NULL       | 画像幅 (px) |
| height           | INTEGER      | NOT NULL       | 画像高さ (px) |
| quality          | INTEGER      |                | 圧縮品質 (1-100) |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |

**制約**:
- UNIQUE(item_image_id, size_type, format_type) : 同一画像の同一サイズ・フォーマットの重複防止
- FOREIGN KEY (item_image_id) REFERENCES item_images(id) ON DELETE CASCADE
- CHECK (size_type IN ('original', 'desktop', 'mobile', 'thumbnail'))
- CHECK (format_type IN ('avif', 'webp', 'jpeg'))
- CHECK (width > 0 AND height > 0)
- CHECK (file_size > 0)
- CHECK (quality IS NULL OR (quality >= 1 AND quality <= 100))

## user_avatar_images（ユーザーアイコン画像情報）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | アイコン画像ID |
| user_id          | INTEGER      | FOREIGN KEY (users.id) | ユーザーID |
| original_filename| VARCHAR(255) | NOT NULL       | 元ファイル名   |
| base_object_key  | VARCHAR(500) | NOT NULL       | ベースオブジェクトキー（拡張子なし） |
| original_size    | INTEGER      | NOT NULL       | 元ファイルサイズ (bytes) |
| original_mime_type| VARCHAR(50) | NOT NULL       | 元MIMEタイプ   |
| processing_status| VARCHAR(20)  | NOT NULL DEFAULT 'pending' | 処理状況 (pending/processing/completed/failed) |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新日時 |

**制約**:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- CHECK (original_size > 0) : ファイルサイズは正の値
- CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))

## user_avatar_variants（ユーザーアイコンサイズ別管理）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | バリアントID   |
| user_avatar_image_id | INTEGER  | FOREIGN KEY (user_avatar_images.id) | 親アイコン画像ID |
| size_type        | VARCHAR(20)  | NOT NULL       | サイズ種別 (avatar_32/avatar_64/avatar_128/avatar_256) |
| object_key       | VARCHAR(500) | NOT NULL       | MinIOオブジェクトキー |
| image_url        | VARCHAR(500) | NOT NULL       | 画像URL (MinIO) |
| file_size        | INTEGER      | NOT NULL       | ファイルサイズ (bytes) |
| width            | INTEGER      | NOT NULL       | 画像幅 (px) |
| height           | INTEGER      | NOT NULL       | 画像高さ (px) |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |

**制約**:
- UNIQUE(user_avatar_image_id, size_type) : 同一アイコン画像の同一サイズの重複防止
- FOREIGN KEY (user_avatar_image_id) REFERENCES user_avatar_images(id) ON DELETE CASCADE
- CHECK (size_type IN ('avatar_32', 'avatar_64', 'avatar_128', 'avatar_256'))
- CHECK (width > 0 AND height > 0)
- CHECK (file_size > 0)

## gacha_results（ガチャ実行履歴）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | 履歴ID         |
| user_id          | INTEGER      | NOT NULL, FOREIGN KEY (users.id) | ユーザーID     |
| gacha_id         | INTEGER      | NOT NULL, FOREIGN KEY (gachas.id) | ガチャID       |
| gacha_item_id    | INTEGER      | NOT NULL, FOREIGN KEY (gacha_items.id) | 当選商品ID     |
| executed_at      | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 実行日時       |

**制約**:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- FOREIGN KEY (gacha_id) REFERENCES gachas(id) ON DELETE CASCADE
- FOREIGN KEY (gacha_item_id) REFERENCES gacha_items(id) ON DELETE CASCADE

**インデックス**:
- `idx_gacha_results_user_id` (user_id)
- `idx_gacha_results_gacha_id` (gacha_id)
- `idx_gacha_results_gacha_item_id` (gacha_item_id)

## admin_operation_logs（ユーザー操作ログ）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | ログID         |
| user_id          | INTEGER      | FOREIGN KEY    | ユーザーID     |
| operation        | VARCHAR(64)  | NOT NULL       | 操作種別       |
| target_table     | VARCHAR(64)  |                | 対象テーブル   |
| target_id        | INTEGER      |                | 対象ID         |
| detail           | TEXT         |                | 詳細           |
| created_at       | TIMESTAMP    | NOT NULL       | 操作日時       |

## gacha_statistics（ガチャ統計）
| カラム名               | 型           | 制約           | 説明           |
|------------------------|--------------|----------------|----------------|
| id                     | SERIAL       | PRIMARY KEY    | 統計ID         |
| gacha_id               | INTEGER      | NOT NULL, FOREIGN KEY | ガチャID       |
| total_draws            | INTEGER      | NOT NULL, DEFAULT 0 | 総抽選回数     |
| unique_users           | INTEGER      | NOT NULL, DEFAULT 0 | ユニークユーザー数 |
| total_revenue          | BIGINT       | NOT NULL, DEFAULT 0 | 総収益         |
| avg_draws_per_user     | DECIMAL(10,2)|                | 1ユーザー当たり平均抽選回数 |
| most_popular_item_id   | INTEGER      | FOREIGN KEY    | 最人気アイテムID |
| male_users             | INTEGER      | NOT NULL, DEFAULT 0 | 男性ユーザー数 |
| female_users           | INTEGER      | NOT NULL, DEFAULT 0 | 女性ユーザー数 |
| other_gender_users     | INTEGER      | NOT NULL, DEFAULT 0 | その他性別ユーザー数 |
| unknown_gender_users   | INTEGER      | NOT NULL, DEFAULT 0 | 性別不明ユーザー数 |
| avg_user_age           | DECIMAL(4,2) |                | 平均ユーザー年齢 |
| age_10s_users          | INTEGER      | NOT NULL, DEFAULT 0 | 10代ユーザー数 |
| age_20s_users          | INTEGER      | NOT NULL, DEFAULT 0 | 20代ユーザー数 |
| age_30s_users          | INTEGER      | NOT NULL, DEFAULT 0 | 30代ユーザー数 |
| age_40s_users          | INTEGER      | NOT NULL, DEFAULT 0 | 40代ユーザー数 |
| age_50s_users          | INTEGER      | NOT NULL, DEFAULT 0 | 50代ユーザー数 |
| age_60plus_users       | INTEGER      | NOT NULL, DEFAULT 0 | 60代以上ユーザー数 |
| unknown_age_users      | INTEGER      | NOT NULL, DEFAULT 0 | 年齢不明ユーザー数 |
| last_calculated        | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 最終計算日時 |
| created_at             | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at             | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新日時 |

**制約**:
- FOREIGN KEY (gacha_id) REFERENCES gachas(id) ON DELETE CASCADE
- FOREIGN KEY (most_popular_item_id) REFERENCES gacha_items(id)

**インデックス**:
- `idx_gacha_statistics_gacha_id` (gacha_id)
- `idx_gacha_statistics_total_draws` (total_draws)

## user_activity_logs（ユーザー行動ログ）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | ログID         |
| user_id          | INTEGER      | NOT NULL, FOREIGN KEY | ユーザーID     |
| action_type      | VARCHAR(50)  | NOT NULL       | 行動種別       |
| gacha_id         | INTEGER      | FOREIGN KEY    | ガチャID       |
| gacha_item_id    | INTEGER      | FOREIGN KEY    | ガチャアイテムID |
| session_id       | VARCHAR(255) |                | セッションID   |
| ip_address       | INET         |                | IPアドレス     |
| user_agent       | TEXT         |                | ユーザーエージェント |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |

**制約**:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- FOREIGN KEY (gacha_id) REFERENCES gachas(id) ON DELETE CASCADE
- FOREIGN KEY (gacha_item_id) REFERENCES gacha_items(id) ON DELETE CASCADE

**インデックス**:
- `idx_user_activity_logs_user_id` (user_id)
- `idx_user_activity_logs_gacha_id` (gacha_id)
- `idx_user_activity_logs_action_type` (action_type)
- `idx_user_activity_logs_created_at` (created_at)

## gacha_hourly_stats（時間別統計）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | 統計ID         |
| gacha_id         | INTEGER      | NOT NULL, FOREIGN KEY | ガチャID       |
| hour_bucket      | TIMESTAMP    | NOT NULL       | 1時間単位集計時間 |
| draws_count      | INTEGER      | NOT NULL, DEFAULT 0 | 抽選回数       |
| unique_users     | INTEGER      | NOT NULL, DEFAULT 0 | ユニークユーザー数 |
| revenue          | BIGINT       | NOT NULL, DEFAULT 0 | 収益           |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |

**制約**:
- FOREIGN KEY (gacha_id) REFERENCES gachas(id) ON DELETE CASCADE
- UNIQUE(gacha_id, hour_bucket)

**インデックス**:
- `idx_gacha_hourly_stats_gacha_id` (gacha_id)
- `idx_gacha_hourly_stats_hour_bucket` (hour_bucket)

## user_preferences（ユーザー設定）
| カラム名              | 型           | 制約           | 説明           |
|-----------------------|--------------|----------------|----------------|
| id                    | SERIAL       | PRIMARY KEY    | 設定ID         |
| user_id               | INTEGER      | NOT NULL, UNIQUE, FOREIGN KEY | ユーザーID     |
| sort_preference       | VARCHAR(50)  | NOT NULL, DEFAULT 'newest' | 表示順設定     |
| theme_preference      | VARCHAR(20)  | DEFAULT 'light'| テーマ設定     |
| notification_enabled  | BOOLEAN      | NOT NULL, DEFAULT true | 通知有効      |
| language              | VARCHAR(10)  | DEFAULT 'ja'   | 言語設定       |
| created_at            | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at            | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新日時 |

**制約**:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

**インデックス**:
- `idx_user_preferences_user_id` (user_id)

## gacha_categories（ガチャカテゴリ）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | カテゴリID     |
| name             | VARCHAR(100) | NOT NULL, UNIQUE | カテゴリ名     |
| description      | TEXT         |                | 説明           |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |

**インデックス**:
- `idx_gacha_categories_name` (name)

## user_interest_categories（ユーザー興味カテゴリ）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | 興味ID         |
| user_id          | INTEGER      | NOT NULL, FOREIGN KEY | ユーザーID     |
| category_id      | INTEGER      | NOT NULL, FOREIGN KEY | カテゴリID     |
| interest_level   | INTEGER      | NOT NULL, DEFAULT 1, CHECK (1-5) | 興味レベル |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |

**制約**:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- FOREIGN KEY (category_id) REFERENCES gacha_categories(id) ON DELETE CASCADE
- UNIQUE(user_id, category_id)
- CHECK (interest_level >= 1 AND interest_level <= 5)

**インデックス**:
- `idx_user_interest_categories_user_id` (user_id)
- `idx_user_interest_categories_category_id` (category_id)

## gacha_category_mappings（ガチャカテゴリマッピング）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | マッピングID   |
| gacha_id         | INTEGER      | NOT NULL, FOREIGN KEY | ガチャID       |
| category_id      | INTEGER      | NOT NULL, FOREIGN KEY | カテゴリID     |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |

**制約**:
- FOREIGN KEY (gacha_id) REFERENCES gachas(id) ON DELETE CASCADE
- FOREIGN KEY (category_id) REFERENCES gacha_categories(id) ON DELETE CASCADE
- UNIQUE(gacha_id, category_id)

**インデックス**:
- `idx_gacha_category_mappings_gacha_id` (gacha_id)
- `idx_gacha_category_mappings_category_id` (category_id)

## gacha_demographic_stats（ガチャデモグラフィック統計）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | 統計ID         |
| gacha_id         | INTEGER      | NOT NULL, FOREIGN KEY | ガチャID       |
| date_bucket      | DATE         | NOT NULL       | 日別集計       |
| gender           | VARCHAR(10)  | CHECK IN ('male','female','other','unknown') | 性別 |
| age_group        | VARCHAR(10)  | CHECK IN ('10s','20s','30s','40s','50s','60plus','unknown') | 年齢層 |
| draws_count      | INTEGER      | NOT NULL, DEFAULT 0 | 抽選回数       |
| unique_users     | INTEGER      | NOT NULL, DEFAULT 0 | ユニークユーザー数 |
| revenue          | BIGINT       | NOT NULL, DEFAULT 0 | 収益           |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |

**制約**:
- FOREIGN KEY (gacha_id) REFERENCES gachas(id) ON DELETE CASCADE
- UNIQUE(gacha_id, date_bucket, gender, age_group)

**インデックス**:
- `idx_gacha_demographic_stats_gacha_id` (gacha_id)
- `idx_gacha_demographic_stats_date_bucket` (date_bucket)
- `idx_gacha_demographic_stats_gender` (gender)
- `idx_gacha_demographic_stats_age_group` (age_group)

## user_gacha_ratings（ユーザーガチャ評価）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | 評価ID         |
| user_id          | INTEGER      | NOT NULL, FOREIGN KEY | ユーザーID     |
| gacha_id         | INTEGER      | NOT NULL, FOREIGN KEY | ガチャID       |
| rating           | INTEGER      | NOT NULL, CHECK (1-5) | 評価（1-5星） |
| review           | TEXT         |                | レビューテキスト |
| is_favorite      | BOOLEAN      | NOT NULL, DEFAULT FALSE | お気に入り |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新日時 |

**制約**:
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- FOREIGN KEY (gacha_id) REFERENCES gachas(id) ON DELETE CASCADE
- UNIQUE(user_id, gacha_id)
- CHECK (rating >= 1 AND rating <= 5)

**インデックス**:
- `idx_user_gacha_ratings_user_id` (user_id)
- `idx_user_gacha_ratings_gacha_id` (gacha_id)
- `idx_user_gacha_ratings_rating` (rating)
- `idx_user_gacha_ratings_is_favorite` (is_favorite)

## ab_tests（A/Bテスト定義）
| カラム名            | 型           | 制約           | 説明           |
|---------------------|--------------|----------------|----------------|
| id                  | SERIAL       | PRIMARY KEY    | テストID       |
| name                | VARCHAR(100) | NOT NULL, UNIQUE | テスト名       |
| description         | TEXT         |                | 説明           |
| variants            | JSONB        | NOT NULL       | バリアント定義 |
| traffic_allocation  | INTEGER      | NOT NULL, DEFAULT 100, CHECK (0-100) | トラフィック配分 |
| target_criteria     | JSONB        | DEFAULT '{}'   | ターゲット条件 |
| config              | JSONB        | DEFAULT '{}'   | テスト設定     |
| start_date          | TIMESTAMP    |                | 開始日時       |
| end_date            | TIMESTAMP    |                | 終了日時       |
| status              | VARCHAR(20)  | NOT NULL, DEFAULT 'draft', CHECK | ステータス |
| created_at          | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at          | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新日時 |
| created_by          | INTEGER      | FOREIGN KEY    | 作成者         |

**制約**:
- CHECK (status IN ('draft', 'active', 'paused', 'completed'))
- CHECK (traffic_allocation >= 0 AND traffic_allocation <= 100)
- FOREIGN KEY (created_by) REFERENCES users(id)

**インデックス**:
- `idx_ab_tests_name` (name)
- `idx_ab_tests_status` (status)
- `idx_ab_tests_dates` (start_date, end_date)

## ab_test_assignments（A/Bテストユーザー割り当て）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | 割り当てID     |
| test_id          | INTEGER      | NOT NULL, FOREIGN KEY | テストID       |
| user_id          | INTEGER      | NOT NULL, FOREIGN KEY | ユーザーID     |
| variant          | VARCHAR(100) | NOT NULL       | バリアント     |
| user_context     | JSONB        | DEFAULT '{}'   | ユーザーコンテキスト |
| assigned_at      | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 割り当て日時 |

**制約**:
- FOREIGN KEY (test_id) REFERENCES ab_tests(id) ON DELETE CASCADE
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- UNIQUE(test_id, user_id)

**インデックス**:
- `idx_ab_test_assignments_test_id` (test_id)
- `idx_ab_test_assignments_user_id` (user_id)
- `idx_ab_test_assignments_variant` (test_id, variant)
- `idx_ab_test_assignments_assigned_at` (assigned_at)

## ab_test_events（A/Bテストイベント記録）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | イベントID     |
| test_id          | INTEGER      | NOT NULL, FOREIGN KEY | テストID       |
| user_id          | INTEGER      | NOT NULL, FOREIGN KEY | ユーザーID     |
| event_type       | VARCHAR(50)  | NOT NULL       | イベント種別   |
| event_data       | JSONB        | DEFAULT '{}'   | イベントデータ |
| timestamp        | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | イベント日時 |

**制約**:
- FOREIGN KEY (test_id) REFERENCES ab_tests(id) ON DELETE CASCADE
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

**インデックス**:
- `idx_ab_test_events_test_id` (test_id)
- `idx_ab_test_events_user_id` (user_id)
- `idx_ab_test_events_event_type` (event_type)
- `idx_ab_test_events_timestamp` (timestamp)

## ab_test_conversions（A/Bテストコンバージョン集計）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | コンバージョンID |
| test_id          | INTEGER      | NOT NULL, FOREIGN KEY | テストID       |
| variant          | VARCHAR(100) | NOT NULL       | バリアント     |
| goal_name        | VARCHAR(100) | NOT NULL       | ゴール名       |
| conversions      | INTEGER      | NOT NULL, DEFAULT 0 | コンバージョン数 |
| total_value      | DECIMAL(15,2)| NOT NULL, DEFAULT 0 | 総価値         |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新日時 |

**制約**:
- FOREIGN KEY (test_id) REFERENCES ab_tests(id) ON DELETE CASCADE
- UNIQUE(test_id, variant, goal_name)

**インデックス**:
- `idx_ab_test_conversions_test_id` (test_id)
- `idx_ab_test_conversions_variant` (test_id, variant)
- `idx_ab_test_conversions_goal` (goal_name)

---

## 📊 データベースビューとファンクション

### v_users_with_demographics（年齢グループ付きユーザービュー）
ユーザー情報に年齢グループと現在年齢を動的に計算して提供するビュー。
- 年齢グループ: '10s', '20s', '30s', '40s', '50s', '60plus', 'unknown'
- 現在年齢: 生年から計算した実年齢

### v_ab_test_results（A/Bテスト結果ビュー）
A/Bテストの結果統計を提供するビュー。
- バリアント別のユーザー数、コンバージョン率、平均価値
- テスト全体の統計サマリー

---

## 🖼️ Sharp.js画像処理システム 設計概要

### 画像管理の新しいアーキテクチャ

本システムでは、Sharp.js高性能画像処理ライブラリを使用して、アップロード時に複数サイズ・フォーマットの画像を自動生成し、レスポンシブWebデザインに最適化された画像配信を実現します。

### 1. 画像テーブル構造

#### 親テーブル（メタデータ管理）
- **gacha_images**: ガチャ用画像のメタデータ
- **item_images**: アイテム用画像のメタデータ

#### 子テーブル（バリアント管理）
- **image_variants**: ガチャ画像の各サイズ・フォーマット別URL
- **item_image_variants**: アイテム画像の各サイズ・フォーマット別URL

### 2. サイズバリエーション

| サイズ種別   | 解像度      | 用途                           |
|-------------|-------------|--------------------------------|
| original    | 最大2048px  | 詳細表示・ズーム表示           |
| desktop     | 1024px      | PC・タブレット表示用           |
| mobile      | 512px       | スマートフォン表示用           |
| thumbnail   | 150px       | 一覧表示・プレビュー用         |

### 3. フォーマット対応

| フォーマット | 圧縮率    | ブラウザサポート              | 優先度 |
|-------------|-----------|-------------------------------|-------|
| AVIF        | 50%以上減 | Chrome 85+, Firefox 93+      | 最高   |
| WebP        | 30%減     | Chrome 23+, Firefox 65+      | 高     |
| JPEG        | 標準      | 全ブラウザ                    | 標準   |

### 4. オブジェクトキー構造

#### ガチャ画像
```
users/{user_id}/gachas/{gacha_id}/{size_type}/{format_type}/{timestamp}_{filename}
```

#### アイテム画像
```
users/{user_id}/items/{size_type}/{format_type}/{timestamp}_{filename}
```

**例**:
```
users/123/items/desktop/avif/1640995200000_diamond.avif
users/123/gachas/456/mobile/webp/1640995200000_main.webp
```

### 5. 処理フロー

1. **アップロード受信**: オリジナルファイル（JPEG/PNG/WebP）
2. **Sharp.js処理**: 4サイズ × 3フォーマット = 12ファイル生成
3. **MinIO保存**: 各ファイルをオブジェクトストレージに保存
4. **DB記録**: メタデータと全バリアントURLをデータベースに記録
5. **フロントエンド配信**: デバイス・ブラウザに応じた最適画像の自動選択

### 6. データベース運用パターン

#### 画像アップロード時
```sql
-- 1. 親レコード作成
INSERT INTO item_images (user_id, original_filename, base_object_key, ...) VALUES (...);

-- 2. 各バリアント作成（12回実行）
INSERT INTO item_image_variants (item_image_id, size_type, format_type, object_key, image_url, ...) VALUES (...);
```

#### 画像取得時（API）
```sql
-- 全サイズ・フォーマット取得
SELECT 
  ii.id, ii.original_filename,
  iiv.size_type, iiv.format_type, iiv.image_url, iiv.width, iiv.height
FROM item_images ii
JOIN item_image_variants iiv ON ii.id = iiv.item_image_id
WHERE ii.id = ? AND ii.processing_status = 'completed'
ORDER BY iiv.size_type, iiv.format_type;
```

### 7. フロントエンド実装例

#### Picture要素による最適画像選択
```html
<picture>
  <!-- デスクトップ用 -->
  <source srcSet="image_desktop.avif" media="(min-width: 768px)" type="image/avif" />
  <source srcSet="image_desktop.webp" media="(min-width: 768px)" type="image/webp" />
  
  <!-- モバイル用 -->
  <source srcSet="image_mobile.avif" media="(max-width: 767px)" type="image/avif" />
  <source srcSet="image_mobile.webp" media="(max-width: 767px)" type="image/webp" />
  
  <!-- フォールバック -->
  <img src="image_desktop.jpg" alt="商品画像" loading="lazy" />
</picture>
```

### 8. パフォーマンス最適化

- **遅延読み込み**: Intersection Observer API活用
- **プリロード**: 重要画像の事前読み込み
- **キャッシュ戦略**: ブラウザキャッシュ + CDN活用
- **プログレッシブローディング**: 低品質 → 高品質の段階的読み込み

---

## 👤 ユーザーアイコンシステム 設計概要

### ユーザーアイコン管理の新機能

ユーザープロフィール機能の一部として、ユーザーが自分専用のアイコン画像をアップロード・管理できるシステムを追加しました。Sharp.jsによる高品質画像処理とAVIF形式変換により、最適化されたアイコン表示を実現します。

### 1. アイコン画像テーブル構造

#### 親テーブル（メタデータ管理）
- **user_avatar_images**: ユーザーアイコン画像のメタデータ

#### 子テーブル（サイズバリアント管理）
- **user_avatar_variants**: アイコンの各サイズ別URL

### 2. アイコンサイズバリエーション

| サイズ種別   | 解像度      | 用途                           |
|-------------|-------------|--------------------------------|
| avatar_256  | 256x256px   | プロフィール詳細・大きな表示   |
| avatar_128  | 128x128px   | 標準プロフィール表示           |
| avatar_64   | 64x64px     | 中サイズアイコン・ナビゲーション |
| avatar_32   | 32x32px     | 小サイズアイコン・一覧表示     |

### 3. フォーマット仕様

- **入力フォーマット**: JPEG, PNG, GIF（最大5MB）
- **出力フォーマット**: AVIF（高圧縮・高品質）
- **形状**: 正方形に自動クロップ（中央基準）
- **圧縮設定**: quality=85, effort=4

### 4. オブジェクトキー構造

#### ユーザーアイコン
```
users/{user_id}/avatar_{size}.avif
```

**例**:
```
users/123/avatar_256.avif  # メインアイコン
users/123/avatar_128.avif  # 標準表示用
users/123/avatar_64.avif   # 中サイズ
users/123/avatar_32.avif   # 小サイズ
```

### 5. 処理フロー

1. **アップロード受信**: オリジナルファイル（JPEG/PNG/GIF）
2. **Sharp.js処理**: 4つの正方形サイズにリサイズ・AVIF変換
3. **MinIO保存**: user-avatarsバケットに保存
4. **DB記録**: メタデータと4つのサイズバリアントURLを記録
5. **ユーザー更新**: users.avatar_image_idを更新

### 6. データベース運用パターン

#### アイコンアップロード時
```sql
-- 1. アイコン画像メタデータ作成
INSERT INTO user_avatar_images (user_id, original_filename, base_object_key, ...) VALUES (...);

-- 2. 各サイズバリアント作成（4回実行）
INSERT INTO user_avatar_variants (user_avatar_image_id, size_type, object_key, image_url, ...) VALUES (...);

-- 3. ユーザーのアイコンID更新
UPDATE users SET avatar_image_id = ? WHERE id = ?;
```

#### アイコン取得時（API）
```sql
-- ユーザー情報とアイコンURL取得
SELECT 
  u.id, u.name, u.email,
  uav.image_url as avatar_url
FROM users u
LEFT JOIN user_avatar_images uai ON u.avatar_image_id = uai.id
LEFT JOIN user_avatar_variants uav ON uai.id = uav.user_avatar_image_id
WHERE u.id = ? AND uav.size_type = 'avatar_256';
```

### 7. フロントエンド実装例

#### アイコン表示コンポーネント
```jsx
const UserAvatar = ({ user, size = 64 }) => {
  const sizeType = `avatar_${size}`;
  const defaultAvatar = '/images/default-avatar.png';
  
  return (
    <img
      src={user.avatarImageUrl || defaultAvatar}
      alt={`${user.name}のアイコン`}
      width={size}
      height={size}
      style={{ borderRadius: '50%' }}
      loading="lazy"
    />
  );
};
```

#### レスポンシブアイコン選択
```jsx
const ResponsiveAvatar = ({ user }) => {
  return (
    <picture>
      <source 
        srcSet={user.avatar_128} 
        media="(min-width: 768px)" 
        type="image/avif" 
      />
      <source 
        srcSet={user.avatar_64} 
        media="(max-width: 767px)" 
        type="image/avif" 
      />
      <img 
        src={user.avatar_64 || '/images/default-avatar.png'} 
        alt={`${user.name}のアイコン`}
        loading="lazy"
      />
    </picture>
  );
};
```

### 8. セキュリティ・制限事項

- **ファイル形式**: JPEG, PNG, GIF のみ許可
- **ファイルサイズ**: 最大5MB
- **所有者制限**: 自分のアイコンのみ変更可能
- **自動削除**: アカウント削除時にアイコンも連動削除
- **不正ファイル対策**: MIMEタイプ検証、Sharp.js処理による安全確認

### 9. パフォーマンス最適化

- **AVIF形式**: 従来比50%以上のファイルサイズ削減
- **マルチサイズ**: 用途に応じた最適サイズ選択
- **遅延読み込み**: loading="lazy"による帯域節約
- **キャッシュ最適化**: 適切なCache-Controlヘッダー設定
