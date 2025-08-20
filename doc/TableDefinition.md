# オンラインガチャシステム テーブル定義（ドラフト）

## users（ユーザー情報）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | ユーザーID     |
| name             | VARCHAR(64)  | NOT NULL       | ユーザー名     |
| email            | VARCHAR(255) | UNIQUE,NOT NULL| メールアドレス |
| password_hash    | VARCHAR(255) | NOT NULL       | パスワードハッシュ |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 登録日時       |
| updated_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新日時       |

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

## gachas_images（ガチャ画像情報）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | 画像ID         |
| gacha_id         | INTEGER      | FOREIGN KEY    | ガチャID       |
| image_url        | VARCHAR(255) | NOT NULL       | 画像URL        |
| sort_order       | INTEGER      | DEFAULT 0      | 並び順         |
| created_at       | TIMESTAMP    | NOT NULL       | 登録日時       |

## gacha_items（ガチャ内の商品情報）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | 商品ID         |
| gacha_id         | INTEGER      | FOREIGN KEY    | ガチャID       |
| name             | VARCHAR(128) | NOT NULL       | 商品名         |
| description      | TEXT         |                | 商品説明       |
| image_url        | VARCHAR(255) |                | 商品画像URL    |
| stock            | INTEGER      |                | 在庫数         |
| is_public        | BOOLEAN      | NOT NULL, DEFAULT TRUE | 公開/非公開  |
| created_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 作成日時       |
| updated_at       | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新日時       |

**注意**: rarityカラムは実装から除外されました。レアリティ機能は現在の仕様には含まれていません。

## gacha_results（ガチャ実行履歴）
| カラム名         | 型           | 制約           | 説明           |
|------------------|--------------|----------------|----------------|
| id               | SERIAL       | PRIMARY KEY    | 履歴ID         |
| user_id          | INTEGER      | FOREIGN KEY    | ユーザーID     |
| gacha_id         | INTEGER      | FOREIGN KEY    | ガチャID       |
| gacha_item_id    | INTEGER      | FOREIGN KEY    | 当選商品ID     |
| executed_at      | TIMESTAMP    | NOT NULL       | 実行日時       |

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
