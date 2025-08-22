# Online Gacha System - LLM Reference Guide

## プロジェクト概要

### システム構成
- **フロントエンド**: React 18 + Material-UI + Framer Motion + Swiper.js
- **バックエンド**: Node.js + Fastify + JWT認証 + MinIO
- **データベース**: PostgreSQL 16
- **ストレージ**: MinIO (S3互換オブジェクトストレージ)
- **開発環境**: Docker + Docker Compose

### アーキテクチャ
```
frontend/          - React フロントエンド
├── src/
│   ├── components/    - 再利用可能コンポーネント
│   ├── utils/         - API クライアント、ヘルパー
│   ├── types/         - TypeScript型定義
│   └── App.js         - メインアプリケーション

web/              - Node.js バックエンド
├── src/
│   ├── routes/        - API エンドポイント
│   ├── models/        - データベースモデル
│   ├── middleware/    - 認証ミドルウェア
│   ├── schemas/       - バリデーションスキーマ
│   ├── config/        - データベース設定
│   └── utils/         - MinIO設定、ヘルパー関数
├── migrations/    - データベーススキーマ
└── seeds/         - 初期データ

doc/              - ドキュメント
```

## データベーススキーマ

### テーブル構造

#### users テーブル
```sql
- id (Primary Key)
- name (VARCHAR(64)) - ユーザー名
- email (VARCHAR(255), UNIQUE) - メールアドレス
- password_hash (VARCHAR(255)) - ハッシュ化パスワード
- created_at, updated_at
```
**※ 注意**: `role`カラムは削除されました。全ユーザーが平等にガチャ作成・管理が可能です。

#### gachas テーブル
```sql
- id (Primary Key)
- name (VARCHAR(128)) - ガチャ名
- description (TEXT) - 説明
- price (INTEGER) - 価格
- created_by (Foreign Key to users) - 作成者
- is_public (BOOLEAN) - 公開状態
- display_from (TIMESTAMP) - 表示開始日時
- display_to (TIMESTAMP) - 表示終了日時
- created_at, updated_at
```

#### gacha_items テーブル
```sql
- id (Primary Key)
- gacha_id (Foreign Key to gachas)
- name (VARCHAR(128)) - アイテム名
- description (TEXT) - 説明
- image_url (VARCHAR(255)) - 画像URL
- rarity (VARCHAR(20)) - レアリティ ('common', 'rare', 'srare', 'ssr')
- stock (INTEGER) - 在庫数
- is_public (BOOLEAN) - 公開状態
- created_at, updated_at
```

#### gacha_results テーブル
```sql
- id (Primary Key)
- user_id (Foreign Key to users)
- gacha_id (Foreign Key to gachas)
- item_id (Foreign Key to gacha_items)
- created_at
```

#### gacha_images テーブル
```sql
- id (Primary Key)
- gacha_id (Foreign Key to gachas) - CASCADE DELETE
- image_url (VARCHAR(500)) - MinIOオブジェクトURL
- display_order (INTEGER, DEFAULT 0) - 表示順序
- is_main (BOOLEAN, DEFAULT false) - メイン画像フラグ
- created_at, updated_at
```
**※ 特徴**: 
- 1つのガチャに複数画像を関連付け可能
- display_orderによる表示順序制御
- is_mainフラグによるメイン画像指定
- MinIOオブジェクトストレージとの連携

## 認証システム

### 認証フロー
1. **新規登録**: `POST /api/auth/register`
2. **ログイン**: `POST /api/auth/login`
3. **JWT トークン発行**: レスポンスでトークン返却、HTTPOnly Cookieで保存
4. **認証が必要なエンドポイント**: Cookie または `Authorization: Bearer <token>` ヘッダー
5. **ページリロード時の認証復元**: ローカルストレージとサーバー検証による自動ログイン復元
6. **平等アクセス制御**: 全ユーザーがガチャ作成・管理可能（ロールベース制御は撤廃）

### 新規登録機能の実装詳細

#### フロントエンド (RegisterForm.js)
```javascript
// バリデーション要件
- name: 2-64文字、必須
- email: 正しいメール形式、必須
- password: 8文字以上、英数字必須
- confirmPassword: パスワードと一致
- agreeToTerms: 利用規約への同意

// 特徴
- React Hook Form + Yup バリデーション
- Material-UI コンポーネント
- パスワード表示/非表示切り替え
- リアルタイムバリデーション
- 詳細なエラーメッセージ表示
```

#### バックエンド (auth.js, User.js)
```javascript
// API エンドポイント: POST /api/auth/register
// リクエスト例:
{
  "name": "ユーザー名",
  "email": "user@example.com", 
  "password": "password123"
}

// レスポンス例（成功時）:
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "ユーザー名",
    "email": "user@example.com"
  }
}

// セキュリティ機能
- bcrypt ハッシュ化（salt rounds: 12）
- メールアドレス重複チェック
- ユーザー名重複チェック
- JWT トークン自動発行
- HTTPOnly Cookie 設定
```

#### エラーハンドリング
```javascript
// エラーコード対応
- EMAIL_ALREADY_EXISTS: メールアドレス重複
- NAME_ALREADY_EXISTS: ユーザー名重複  
- Validation failed: 入力値不正
- INTERNAL_SERVER_ERROR: サーバーエラー

// 日本語エラーメッセージ
- フロントエンド、バックエンド両方で対応
- ユーザーフレンドリーなメッセージ
```

### デフォルトユーザー
```sql
-- パスワードは全て "password123"
- tanaka@example.com
- sato@example.com
- suzuki@example.com
- test@example.com - API テスト用
```
**※ 注意**: 管理者ロールは廃止されました。全ユーザーが平等に機能を利用できます。

## API エンドポイント

### 認証 API (/api/auth)
```
POST /login        - ログイン
POST /register     - 新規登録
GET /me           - ユーザー情報取得
POST /logout      - ログアウト
```

### ガチャ API (/api/gachas)
```
GET /             - 公開ガチャ一覧（画像配列付き）
GET /:id          - ガチャ詳細
POST /:id/draw    - ガチャ実行

# マイガチャ管理 (要認証) - 旧APIパス: /api/admin → /api/my に変更済み
GET /my           - 自分のガチャ一覧
POST /my          - ガチャ作成
GET /my/:id       - 自分のガチャ詳細
PUT /my/:id       - ガチャ更新
DELETE /my/:id    - ガチャ削除
PUT /my/:id/toggle-public - 公開状態切り替え

# ガチャ画像管理 API (要認証)
GET /my/:id/images           - ガチャ画像一覧取得
POST /my/:id/images          - ガチャ画像アップロード
DELETE /my/:id/images/:imageId - ガチャ画像削除
PUT /my/:id/images/:imageId/main - メイン画像設定
PUT /my/:id/images/order     - 画像表示順序更新
```

## フロントエンドコンポーネント・URL構造

### 主要コンポーネント ✅ URL分離実装完了
```
App.js                - メインアプリケーション、ルーティング、認証状態管理
                      - URL分離実装: React Router によるパラメータベースルーティング
LoginForm.js          - ログインフォーム（API統合済み）
RegisterForm.js       - 新規登録フォーム（API統合済み）
UserGachaList.js      - 公開ガチャ一覧 (URL: /gacha)（マルチ画像スライド表示対応）
UserGachaDetail.js    - ガチャ詳細・実行画面 (URL: /gacha/:id)
MyGachaList.js        - マイガチャ一覧 (URL: /my-gacha)（完全実装済み）
AdminGachaEdit.js     - ガチャ編集・新規作成 (URL: /my-gacha/new, /my-gacha/edit/:id)
                      - ガチャ画像管理機能（アップロード、削除、順序変更、メイン画像設定）
GachaPerformance.js   - ガチャ実行演出
```

### URL構造 ✅ 分離実装完了
```
/gacha              - ガチャ一覧画面
/gacha/:id          - ガチャ詳細画面（URL パラメータからガチャID取得）
/my-gacha           - マイガチャ管理画面
/my-gacha/new       - ガチャ新規作成画面
/my-gacha/edit/:id  - ガチャ編集画面（URL パラメータからガチャID取得）
/login              - ログイン画面
/register           - 新規登録画面
```

### 認証状態管理
- **永続化**: ローカルストレージによる認証状態保存
- **復元機能**: ページリロード時の自動ログイン復元
- **サーバー検証**: トークン有効性の定期確認
- **エラーハンドリング**: 無効トークンの自動クリア

## 権限システム（廃止済み）

### 平等アクセス設計
- **全ユーザー共通権限**: 
  - 自分のガチャの作成・編集・削除
  - 公開ガチャの閲覧・実行
  - システム機能への平等アクセス
- **所有者ベース制御**: ガチャは作成者のみが編集・削除可能
- **公開設定**: 各ユーザーが自分のガチャの公開範囲を制御

### 認証チェック
- バックエンド: JWT トークンからユーザー情報抽出
- フロントエンド: 認証状態に基づくUI制御
- **ロールチェック**: 完全に撤廃されました

## バリデーション

### 新規登録バリデーション (Joi スキーマ)
```javascript
// 新規登録
registerSchema = {
  name: string (2-64文字, 必須) - ユーザー名
  email: string (email形式, 必須) - メールアドレス
  password: string (8文字以上, 英数字必須, 必須) - パスワード
}

// ログイン
loginSchema = {
  email: string (email形式, 必須)
  password: string (6文字以上, 必須)
}
```
**※ 注意**: `role`フィールドは削除されました。

### ガチャ関連バリデーション (Joi スキーマ)
```javascript
// ガチャ作成・更新
createGachaSchema = {
  name: string (1-128文字, 必須)
  description: string (0-1000文字, 任意)
  price: number (1以上, 必須)
  isPublic: boolean (デフォルト: true)
  displayFrom: date (ISO形式, 任意)
  displayTo: date (ISO形式, 任意)
}

// ガチャ実行
gachaDrawSchema = {
  count: number (1-10, デフォルト: 1)
}
```

## 開発環境

### 起動手順
```bash
# Docker環境起動
make docker-up

# 個別起動
docker-compose up -d

# サービス確認
docker-compose ps
```

### 環境設定
```
フロントエンド: http://localhost:3000
バックエンド: http://localhost:8080
データベース: localhost:5432
MinIO: http://localhost:9000 (Admin UI: http://localhost:9001)
```

### データベース初期化
```bash
# マイグレーション実行
docker-compose exec web npm run migrate

# シードデータ投入
docker-compose exec web npm run seed
```

## トラブルシューティング

### よくある問題

#### 1. 新規登録エラー
- **症状**: "Email already exists" または "Name already exists"
- **原因**: 重複するメールアドレスまたはユーザー名での登録試行
- **解決**: 
  1. 異なるメールアドレス・ユーザー名を使用
  2. データベースの既存データ確認

#### 2. バリデーションエラー
- **症状**: "パスワードは英数字を含む必要があります"
- **原因**: パスワード要件不適合（8文字未満、英数字なし）
- **解決**: 
  1. 8文字以上の英数字を含むパスワードを使用
  2. フロントエンドでリアルタイムバリデーション確認

#### 3. 認証状態が維持されない
- **症状**: ページリロード後にログアウト状態になる
- **原因**: ローカルストレージまたはトークン有効性の問題
- **解決**: 
  1. ブラウザのローカルストレージを確認
  2. 再ログインしてトークンを更新
  3. Cookie設定の確認

#### 4. 認証エラー
- **症状**: "Invalid email or password"
- **原因**: パスワードハッシュの不一致
- **解決**: 
  1. シードデータの確認
  2. パスワード: "password123" を使用

#### 5. データベース接続エラー
- **症状**: Connection refused
- **原因**: Docker コンテナの起動順序
- **解決**: 
  1. `docker-compose down && docker-compose up -d`
  2. データベース起動確認後にアプリ起動

### デバッグ方法

#### ログ確認
```bash
# アプリケーションログ
docker-compose logs web

# データベースログ
docker-compose logs db

# フロントエンドログ
docker-compose logs frontend
```

#### API テスト
```bash
# 新規登録
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "テストユーザー",
    "email": "test@example.com",
    "password": "password123"
  }'

# ログイン
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "tanaka@example.com", "password": "password123"}'

# ガチャ一覧取得
curl http://localhost:8080/api/gachas

# 認証付きリクエスト（Cookie使用）
curl -b cookies.txt -c cookies.txt \
     http://localhost:8080/api/my/gachas
```

## 技術仕様

### セキュリティ
- JWT トークン認証（HTTPOnly Cookie + Bearer token 対応）
- bcrypt パスワードハッシュ（salt rounds: 12）
- CORS 設定（credentials: include）
- SQL インジェクション対策 (パラメータ化クエリ)
- バリデーション（フロントエンド: Yup、バックエンド: Joi）
- 重複登録防止（email、name の一意性チェック）

### パフォーマンス
- ページネーション実装
- データベースインデックス
- 画像遅延読み込み
- API レスポンスキャッシュ

### UI/UX
- Material-UI デザインシステム
- Framer Motion アニメーション
- レスポンシブデザイン
- アクセシビリティ対応

## 今後の拡張予定

### 機能追加
- ガチャ確率設定
- アイテム交換機能
- ユーザー間取引
- 統計・分析機能

### 技術改善
- TypeScript 導入
- テストカバレッジ向上
- CI/CD パイプライン
- 本番環境対応

## 重要な注意点

### コード修正時
1. **認証確認**: エンドポイント変更時は認証ミドルウェアの適用確認
2. **所有者チェック**: ユーザーが自分のデータのみにアクセスできることを確認
3. **バリデーション**: 入力データの検証スキーマ更新（フロントエンド・バックエンド両方）
4. **エラーハンドリング**: 適切なHTTPステータスコードとエラーメッセージ
5. **フィールド名統一**: フロントエンドとバックエンドでフィールド名を統一（例: `name`）
6. **認証状態管理**: ページリロード時の認証復元機能の確認

### データベース変更時
1. **マイグレーション**: スキーマ変更はマイグレーションファイルで管理
2. **インデックス**: パフォーマンス影響を考慮したインデックス設計
3. **外部キー**: データ整合性のための外部キー制約

### デプロイ時
1. **環境変数**: 本番環境用の環境変数設定
2. **シークレット**: JWT シークレット、データベースパスワードの適切な管理
3. **HTTPS**: 本番環境では HTTPS 必須

## 変更履歴

## 変更履歴

### 2025年8月22日 - ガチャ画像管理システム実装
- **ストレージシステム追加**:
  - MinIO S3互換オブジェクトストレージ導入
  - Docker Compose環境への MinIO 統合
  - ガチャ画像専用フォルダ構造: `users/{userId}/gachas/{gachaId}/`

- **データベース拡張**:
  - マイグレーション実行: `006_add_gacha_images.sql`
  - `gacha_images` テーブル追加（画像URL、表示順序、メイン画像フラグ）
  - 外部キー制約とCASCADE DELETE設定

- **バックエンド実装**:
  - `utils/minio.js`: MinIO クライアント設定とヘルパー関数
  - `models/Gacha.js`: ガチャ画像管理メソッド実装
    - `getGachaImages()`: 画像一覧取得
    - `addGachaImage()`: 画像追加
    - `deleteGachaImage()`: 画像削除とMinIOオブジェクト削除
    - `setMainImage()`: メイン画像設定
    - `updateImageOrder()`: 表示順序更新
    - `findActiveWithFilters()`: 画像配列付きガチャ一覧取得
  - `routes/admin.js`: ガチャ画像CRUD API エンドポイント実装
    - マルチパートファイルアップロード対応
    - 所有者ベースアクセス制御

- **フロントエンド実装**:
  - `AdminGachaEdit.js`: ガチャ画像管理UI実装
    - ドラッグ&ドロップファイルアップロード
    - 画像グリッド表示、削除機能
    - メイン画像設定、表示順序変更
  - `UserGachaList.js`: マルチ画像スライド表示対応
    - Swiper.js による画像スライダー実装
    - 複数画像時の自動スライド表示（3秒間隔、ループ再生）
    - 単一画像時の静的表示
  - `utils/api.js`: ガチャ画像API関数実装

- **技術仕様**:
  - ファイル形式: JPEG, PNG, GIF対応
  - ファイルサイズ制限: 10MB
  - 画像最適化: 自動リサイズ（最大1200px）
  - セキュリティ: 所有者のみアクセス可能、ファイル形式検証

- **UI/UX改善**:
  - Material-UI + Swiper.js による滑らかなスライド表示
  - ナビゲーション、ページネーション表示
  - レスポンシブ対応（モバイル・デスクトップ）
  - 画像なし時のフォールバック表示

### 2025年8月21日 - URL構造分離実装
- **フロントエンド改修**:
  - URL分離実装: ガチャ一覧とガチャ詳細のURL分離 (`/gacha` → `/gacha/:id`)
  - URL分離実装: マイガチャ管理とガチャ編集のURL分離 (`/my-gacha` → `/my-gacha/edit/:id`)
  - 新規ガチャ作成の独立URL: `/my-gacha/new`

- **ルーティング改善**:
  - `App.js`: React Router による URL パラメータベースのナビゲーション実装
  - 各コンポーネントの props 依存からURL パラメータ依存への移行
  - ブラウザの戻る/進むボタン対応の改善

- **コンポーネント修正**:
  - `AdminGachaEdit.js`: URL パラメータ (`useParams`) からガチャID取得に変更
  - `UserGachaDetail.js`: URL パラメータによるガチャ詳細取得対応
  - ラッパーコンポーネント実装: `GachaDetailWrapper`, `GachaEditWrapper`, `NewGachaWrapper`

- **API修正・バグ修正**:
  - `web/src/routes/admin.js`: ガチャ取得・更新エンドポイントの修正
  - `web/src/models/Gacha.js`: `update` メソッドの完全実装（全フィールド対応）
  - バックエンドAPI endpoints の安定化

### 2025年8月19日 - ロールベースアクセス制御の完全撤廃と認証永続化
- **アーキテクチャ変更**:
  - 管理者・ユーザーの区別を完全撤廃
  - 全ユーザーがガチャ作成・管理機能に平等アクセス
  - 所有者ベースアクセス制御への移行

- **データベース変更**:
  - マイグレーション実行: `005_remove_user_roles.sql`
  - `users.role`カラムの削除
  - `gachas.user_id` → `gachas.created_by`へのリネーム
  - シードデータ更新: `003_no_role_user_seed.sql`

- **バックエンド修正**:
  - `User.js`: roleフィールド完全削除、toJSON()更新
  - `auth.js`: 登録・ログイン処理からrole除去
  - `validation.js`: registerSchemaからrole削除
  - `middleware/auth.js`: requireAdmin削除
  - `Gacha.js`: 所有者ベースアクセス制御実装

- **フロントエンド修正**:
  - `App.js`: 認証状態永続化実装（useEffect + localStorage）
  - `LoginForm.js`: authAPI統合、実際のAPI呼び出し
  - `RegisterForm.js`: authAPI統合、実際のAPI呼び出し
  - `MyGachaList.js`: 完全実装（モックから実API移行）
  - `utils/api.js`: roleパラメータ削除、myGachaAPI実装

- **認証機能強化**:
  - ページリロード時の認証状態復元
  - ローカルストレージによる認証情報永続化
  - サーバートークン検証による認証確認
  - 無効トークンの自動クリア機能

- **API仕様変更**:
  - `/api/admin/*` → `/api/my/*`へのエンドポイント変更
  - 所有者チェック機能の強化
  - 全APIからrole要件削除

### 2025年8月18日 - 新規ユーザー登録機能実装
- **フロントエンド**:
  - `RegisterForm.js`: 実際のAPI呼び出し実装
  - バリデーション強化（パスワード要件: 8文字以上、英数字必須）
  - 詳細なエラーハンドリング
  - `api.js`: register関数の引数を`name`に統一

- **バックエンド**:
  - `validation.js`: registerSchemaの更新（日本語エラーメッセージ追加）
  - `auth.js`: 新規登録エンドポイントの改善
  - `User.js`: フィールド名の統一（`name`使用）
  - 重複チェック強化（email, name両方）
  - セキュリティ向上（bcrypt salt rounds: 12）

- **API仕様**:
  - `POST /api/auth/register` エンドポイント完全実装
  - HTTPOnly Cookie対応
  - 詳細なエラーコード体系

- **テスト確認**:
  - 新規ユーザー登録APIの動作確認完了
  - 重複チェック機能の動作確認完了
