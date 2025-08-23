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
| stock            | INTEGER      |                | 在庫数         |
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
