# オンラインガチャシステム テーブル定義（ドラフト）

## users（ユーザー情報）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | ユーザーID     |
| name             | VARCHAR(64)  | NOT NULL       | ユーザー名     |
| email            | VARCHAR(255) | UNIQUE,NOT NULL| メールアドレス |
| password_hash    | VARCHAR(255) | NOT NULL       | パスワードハッシュ |
| created_at       | TIMESTAMP    | NOT NULL       | 登録日時       |
| updated_at       | TIMESTAMP    | NOT NULL       | 更新日時       |

## admins（店舗管理者情報）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | 管理者ID       |
| name             | VARCHAR(64)  | NOT NULL       | 管理者名       |
| email            | VARCHAR(255) | UNIQUE,NOT NULL| メールアドレス |
| password_hash    | VARCHAR(255) | NOT NULL       | パスワードハッシュ |
| created_at       | TIMESTAMP    | NOT NULL       | 登録日時       |
| updated_at       | TIMESTAMP    | NOT NULL       | 更新日時       |

## gachas（ガチャ情報）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | ガチャID       |
| name             | VARCHAR(128) | NOT NULL       | ガチャ名       |
| description      | TEXT         |                | 説明           |
| price            | INTEGER      | NOT NULL       | 価格（ポイント等）|
| admin_id         | INTEGER      | FOREIGN KEY    | 管理者ID       |
| created_at       | TIMESTAMP    | NOT NULL       | 作成日時       |
| updated_at       | TIMESTAMP    | NOT NULL       | 更新日時       |

## gacha_items（ガチャ内の商品情報）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | 商品ID         |
| gacha_id         | INTEGER      | FOREIGN KEY    | ガチャID       |
| name             | VARCHAR(128) | NOT NULL       | 商品名         |
| description      | TEXT         |                | 商品説明       |
| image_url        | VARCHAR(255) |                | 商品画像URL    |
| stock            | INTEGER      |                | 在庫数         |
| probability      | NUMERIC(5,4) | NOT NULL       | 当選確率（例:0.1234=12.34%）|
| created_at       | TIMESTAMP    | NOT NULL       | 作成日時       |
| updated_at       | TIMESTAMP    | NOT NULL       | 更新日時       |

## gacha_results（ガチャ実行履歴）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | 履歴ID         |
| user_id          | INTEGER      | FOREIGN KEY    | ユーザーID     |
| gacha_id         | INTEGER      | FOREIGN KEY    | ガチャID       |
| gacha_item_id    | INTEGER      | FOREIGN KEY    | 当選商品ID     |
| executed_at      | TIMESTAMP    | NOT NULL       | 実行日時       |
