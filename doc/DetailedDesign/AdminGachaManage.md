# ガチャ管理画面 詳細設計 ✅ バックエンド実装完了・URL分離完了

## 1. 画面概要
- ガチャの新規作成・編集・削除・アイテム管理を行うための管理画面
- ガチャごとにアイテムリストや在庫数などを管理
- すべてのユーザーが自分のガチャを管理可能
- **実装状況**: バックエンドAPI完全実装済み、フロントエンド実装待ち
- **URL構造**: 
  - マイガチャ管理: `/my-gacha`
  - ガチャ新規作成: `/my-gacha/new`
  - ガチャ編集: `/my-gacha/edit/:id`

## 2. 画面構成

### 2.1 ガチャ一覧画面（AdminGachaManage）✅ URL分離完了
- **URL**: `/my-gacha`
- ガチャ一覧表示（ページネーション対応）
  - ガチャ名、説明、価格、公開状態、作成日時
  - 公開/非公開の切り替えスイッチ
- 新規ガチャ作成ボタン（遷移先: `/my-gacha/new`）
- 各ガチャの編集・削除ボタン（編集遷移先: `/my-gacha/edit/:id`）
- 検索・フィルタ機能（将来対応）

### 2.2 ガチャ編集/新規作成画面（AdminGachaEdit）✅ URL分離完了
- **新規作成URL**: `/my-gacha/new`
- **編集URL**: `/my-gacha/edit/:id`
- URL パラメータからガチャIDを自動取得
- 基本情報入力
  - ガチャ名（必須、最大128文字）
  - 説明文（最大1000文字）
  - 価格（必須、1以上の整数）
  - 公開/非公開切替
  - 表示期間（開始日・終了日、任意）
- **ガチャ画像管理セクション（新規追加）**
  - ガチャ画像一覧表示（複数画像対応）
  - メイン画像の設定（最初の画像を自動でメイン画像に設定）
  - 画像の並び替え機能（ドラッグ&ドロップ）
  - 画像アップロード（複数ファイル同時アップロード対応）
  - 画像削除機能
  - 画像プレビュー表示
- アイテム管理セクション（ガチャ作成後に表示）
  - アイテム一覧テーブル
  - アイテム名、在庫数、公開状態、画像
  - アイテムの追加・編集・削除機能
- 保存/キャンセルボタン
- 一覧に戻るボタン（遷移先: `/my-gacha`）

### 2.3 アイテム編集ダイアログ
- アイテム名（必須、最大128文字）
- 説明（最大1000文字）
- 在庫数（0以上の整数）
- 画像アップロード
  - ファイル選択ボタン（JPEG, PNG, WebP対応）
  - ドラッグ&ドロップアップロード対応
  - 画像プレビュー表示
  - ファイルサイズ制限: 最大5MB
  - 既存画像の置き換え・削除機能
- 画像URL（MinIOオブジェクトキー、自動生成）
- 公開/非公開切替
- 保存/キャンセルボタン

### 2.4 画像管理セクション
- アップロード済み画像一覧
- 画像のサムネイル表示
- 画像の削除・置き換え機能
- 使用中の画像の表示（どのアイテムで使用されているか）
- 未使用画像の一括削除機能（将来対応）

### 2.5 削除確認ダイアログ
- ガチャ削除時の確認メッセージ
- 削除/キャンセルボタン
- アイテム削除時の確認メッセージ
- 画像削除時の確認メッセージ（関連アイテムの警告含む）

## 3. 画面遷移イメージ ✅ URL分離完了
- マイガチャ管理一覧 (`/my-gacha`) → [新規作成] → ガチャ新規作成画面 (`/my-gacha/new`) → 成功メッセージ表示 → 自動的にガチャ編集画面に遷移 (`/my-gacha/edit/:id`)
- マイガチャ管理一覧 (`/my-gacha`) → [編集] → ガチャ編集画面 (`/my-gacha/edit/:id`)（アイテム管理含む）
- マイガチャ管理一覧 (`/my-gacha`) → [削除] → 削除確認ダイアログ
- ガチャ編集画面 (`/my-gacha/edit/:id`) → [アイテム追加] → アイテム編集ダイアログ
- アイテム一覧 → [編集] → アイテム編集ダイアログ
- アイテム一覧 → [削除] → 削除確認ダイアログ
- ガチャ編集画面 → [一覧に戻る] → マイガチャ管理一覧 (`/my-gacha`)
- ブラウザの戻る/進むボタン対応

## 4. バリデーション・UX
- 必須項目未入力時は保存不可
- ガチャ名: 1-128文字、必須
- 説明: 0-1000文字
- 価格: 1以上の整数、必須
- アイテム名: 1-128文字、必須
- 在庫数: 0以上の整数
- 画像ファイル: JPEG/PNG/WebP、最大5MB
- 画像アップロード時の進捗表示
- アップロード失敗時のリトライ機能
- 新規ガチャ作成成功時は成功メッセージ表示
- アイテム管理セクションは動的に表示
- エラー時は詳細なエラーメッセージを表示
- 画像削除時の安全確認（使用中の画像の警告）

## 5. API設計 ✅ 実装完了
### 5.1 管理用エンドポイント（/api/admin/*）
- ✅ GET /api/admin/gachas ... ユーザーのガチャ一覧取得（ページネーション対応）
- ✅ POST /api/admin/gachas ... ガチャ新規作成
- ✅ PUT /api/admin/gachas/:id ... ガチャ編集
- ✅ DELETE /api/admin/gachas/:id ... ガチャ削除
- ✅ PATCH /api/admin/gachas/:id/publish ... 公開状態切り替え
- ✅ GET /api/admin/gachas/:id/items ... アイテム一覧取得
- ✅ POST /api/admin/gachas/:id/items ... アイテム追加
- ✅ PUT /api/admin/gachas/:gachaId/items/:itemId ... アイテム編集
- ✅ DELETE /api/admin/gachas/:gachaId/items/:itemId ... アイテム削除

### 5.2 ガチャ画像管理エンドポイント（新規追加）
- 🔄 POST /api/admin/gachas/:id/images/upload ... ガチャ画像アップロード（MinIOへ）
- 🔄 GET /api/admin/gachas/:id/images ... ガチャの画像一覧取得
- 🔄 PUT /api/admin/gachas/:id/images/order ... ガチャ画像の並び順変更
- 🔄 DELETE /api/admin/gachas/:id/images/:imageId ... ガチャ画像削除（MinIOから）
- 🔄 PATCH /api/admin/gachas/:id/images/:imageId/main ... メイン画像設定

### 5.3 アイテム画像管理エンドポイント（既存）
- ✅ POST /api/admin/images/upload ... 画像ファイルアップロード（MinIOへ）
- ✅ GET /api/admin/images ... ユーザーの画像一覧取得
- ✅ DELETE /api/admin/images/:objectKey ... 画像削除（MinIOから）
- ❌ GET /api/admin/images/:objectKey/usage ... 画像使用状況確認

### 5.4 MinIO統合仕様
- **アップロード処理**: multipart/form-dataでファイル受信
- **アイテム画像オブジェクトキー**: `users/{user_id}/items/{timestamp}_{original_filename}`
- **ガチャ画像オブジェクトキー**: `users/{user_id}/gachas/{gacha_id}/{timestamp}_{original_filename}`
- **画像URL生成**: `http://localhost:9000/gacha-images/{object_key}`
- **メタデータ保存**: ファイル名、サイズ、MIMEタイプをMinIOオブジェクトメタデータに保存
- **重複回避**: タイムスタンプ + ユーザーID + ガチャID組み合わせによるユニークキー生成

### 5.5 認証・セキュリティ
- ✅ JWT認証による本人確認
- ✅ ガチャオーナーシップ検証（本人のガチャのみ管理可能）
- ✅ SQLインジェクション対策（パラメータ化クエリ）
- ✅ 入力値検証（Joi）
- ✅ 画像ファイル検証（MIMEタイプ、マジックバイト確認）
- ✅ ファイルサイズ制限（アップロード時）
- ❌ 画像アクセス権限制御（MinIO側設定）

### 5.6 レスポンス形式
```json
// ガチャ一覧取得レスポンス
{
  "gachas": [
    {
      "id": 1,
      "name": "レアアイテムガチャ",
      "description": "レアなアイテムが当たるガチャです",
      "price": 100,
      "is_public": true,
      "main_image_url": "http://localhost:9000/gacha-images/users/1/gachas/1/1704067200000_gacha_main.jpg",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}

// アイテム一覧取得レスポンス
{
  "items": [
    {
      "id": 1,
      "name": "ダイヤモンド",
      "description": "貴重なダイヤモンド",
      "stock": 100,
      "image_url": "http://localhost:9000/gacha-images/users/123/items/1640995200000_diamond.png",
      "is_public": true
    }
  ]
}

// ガチャ画像一覧取得レスポンス（新規追加）
{
  "images": [
    {
      "id": 1,
      "gacha_id": 1,
      "image_url": "http://localhost:9000/gacha-images/users/123/gachas/1/1640995200000_main.jpg",
      "object_key": "users/123/gachas/1/1640995200000_main.jpg",
      "filename": "main.jpg",
      "size": 3145728,
      "mime_type": "image/jpeg",
      "display_order": 1,
      "is_main": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "gacha_id": 1,
      "image_url": "http://localhost:9000/gacha-images/users/123/gachas/1/1640995260000_sub1.jpg",
      "object_key": "users/123/gachas/1/1640995260000_sub1.jpg",
      "filename": "sub1.jpg",
      "size": 2097152,
      "mime_type": "image/jpeg",
      "display_order": 2,
      "is_main": false,
      "created_at": "2024-01-01T00:01:00.000Z"
    }
  ]
}

// 画像アップロードレスポンス
{
  "success": true,
  "image_url": "http://localhost:9000/gacha-images/users/123/items/1640995200000_diamond.png",
  "object_key": "users/123/items/1640995200000_diamond.png",
  "metadata": {
    "filename": "diamond.png",
    "size": 2048576,
    "mimeType": "image/png"
  }
}

// 画像一覧取得レスポンス
{
  "images": [
    {
      "object_key": "users/123/items/1640995200000_diamond.png",
      "image_url": "http://localhost:9000/gacha-images/users/123/items/1640995200000_diamond.png",
      "filename": "diamond.png",
      "size": 2048576,
      "mimeType": "image/png",
      "uploaded_at": "2024-01-01T00:00:00.000Z",
      "used_by_items": ["ダイヤモンド", "レアダイヤ"]
    }
  ]
}
```

## 6. 技術仕様 ✅ バックエンド実装完了
### 6.1 実装済み技術スタック
- ✅ バックエンド: Node.js + Fastify + JWT認証
- ✅ データベース: PostgreSQL（完全スキーマ対応）
- ✅ バリデーション: Joi（バックエンド）
- ✅ 認証: JWT + ミドルウェア認証
- ✅ エラーハンドリング: 統一されたエラーレスポンス形式
- ✅ セキュリティ: パラメータ化クエリ、オーナーシップ検証

### 6.2 実装済み技術スタック
- ✅ バックエンド: Node.js + Fastify + JWT認証
- ✅ データベース: PostgreSQL（完全スキーマ対応）
- ✅ バリデーション: Joi（バックエンド）
- ✅ 認証: JWT + ミドルウェア認証
- ✅ エラーハンドリング: 統一されたエラーレスポンス形式
- ✅ セキュリティ: パラメータ化クエリ、オーナーシップ検証
- ✅ MinIO統合: MinIO Client（minio JavaScript library）
- ❌ ファイルアップロード: Fastify Multipart Plugin
- ❌ 画像処理: Sharp（リサイズ・最適化、将来対応）

### 6.3 MinIO技術仕様
- **ライブラリ**: `minio` JavaScript client
- **バケット**: `gacha-images`
- **アクセス制御**: パブリック読み取り許可
- **オブジェクトキー形式**: `users/{user_id}/items/{timestamp}_{filename}`
- **メタデータ**: `x-amz-meta-original-name`, `x-amz-meta-uploaded-by`
- **URL形式**: `http://localhost:9000/gacha-images/{object_key}`

### 6.4 データベース実装状況
- ✅ gachas テーブル: 完全対応（is_public列使用）
- ✅ gacha_items テーブル: 完全CRUD対応、image_url列でMinIOオブジェクトURL保存
- ✅ users テーブル: 認証対応
- ✅ マイグレーション: 最新スキーマ適用済み
- ❌ images テーブル: MinIO画像メタデータ管理（将来実装予定）

## 7. 実装完了事項・備考
### 7.1 完了済み機能
- ✅ 管理用APIエンドポイント全機能
- ✅ JWT認証システム
- ✅ ガチャCRUD操作（作成・読取・更新・削除）
- ✅ アイテムCRUD操作（作成・読取・更新・削除）
- ✅ 公開状態切り替え機能
- ✅ オーナーシップ検証（本人のガチャのみアクセス可）
- ✅ 入力値検証とエラーハンドリング
- ✅ ページネーション対応

### 7.2 実装待ち機能
- 🔄 レスポンシブデザイン対応（スマホ・PC）
- 🔄 Material-UIコンポーネントを使用したモダンなUI
- 🔄 リアルタイムでの状態更新（公開/非公開切り替え等）
- 🔄 フロントエンド全画面実装
- ❌ 画像アップロード機能（ドラッグ&ドロップ対応）
- ❌ 画像プレビュー・管理機能
- ❌ MinIO統合によるファイル管理
- ❌ 画像の自動リサイズ・最適化（将来対応）
- ❌ アップロード進捗表示
- ❌ 画像使用状況表示機能

### 7.3 開発メモ
- データベーススキーマは統一済み（is_public列使用）
- 認証ミドルウェアによる自動的な本人確認
- エラーレスポンスの標準化完了
- API テスト完了（curl による動作確認済み）
- MinIO統合により画像URLは動的生成（`http://localhost:9000/gacha-images/{object_key}`）
- 画像アップロード時のセキュリティ検証が必要（MIMEタイプ、マジックバイト）
- オブジェクトキーのユニーク性確保が重要（タイムスタンプ + ユーザーID使用）
- 本番環境では画像CDN連携を検討（CloudFront等）
