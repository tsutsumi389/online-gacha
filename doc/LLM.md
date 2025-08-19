# Online Gacha System - LLM Reference Guide

## プロジェクト概要

### システム構成
- **フロントエンド**: React 18 + Material-UI + Framer Motion
- **バックエンド**: Node.js + Fastify + JWT認証
- **データベース**: PostgreSQL 16
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
│   └── config/        - データベース設定
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
- role (VARCHAR(20)) - 'user' または 'admin'
- created_at, updated_at
```

#### gachas テーブル
```sql
- id (Primary Key)
- name (VARCHAR(128)) - ガチャ名
- description (TEXT) - 説明
- price (INTEGER) - 価格
- user_id (Foreign Key to users) - 作成者
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

## 認証システム

### 認証フロー
1. **新規登録**: `POST /api/auth/register`
2. **ログイン**: `POST /api/auth/login`
3. **JWT トークン発行**: レスポンスでトークン返却、HTTPOnly Cookieで保存
4. **認証が必要なエンドポイント**: Cookie または `Authorization: Bearer <token>` ヘッダー
5. **ロールベースアクセス制御**: user/admin ロール

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
    "email": "user@example.com",
    "role": "user"
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
- tanaka@example.com (user)
- sato@example.com (user)
- admin@example.com (admin)
- suzuki@example.com (user)
- test@example.com (user) - API テスト用
```

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
GET /             - 公開ガチャ一覧
GET /:id          - ガチャ詳細
POST /:id/draw    - ガチャ実行

# ユーザー専用 (要認証)
GET /my           - 自分のガチャ一覧
POST /my          - ガチャ作成
GET /my/:id       - 自分のガチャ詳細
PUT /my/:id       - ガチャ更新
DELETE /my/:id    - ガチャ削除
PUT /my/:id/toggle-public - 公開状態切り替え
```

### 管理者 API (/api/admin)
```
GET /gachas       - 全ガチャ一覧 (管理者のみ)
POST /gachas      - ガチャ作成 (管理者のみ)
PUT /gachas/:id   - ガチャ更新 (管理者のみ)
DELETE /gachas/:id - ガチャ削除 (管理者のみ)
PUT /gachas/:id/toggle-public - 公開状態切り替え (管理者のみ)
```

## フロントエンドコンポーネント

### 主要コンポーネント
```
App.js                - メインアプリケーション、ルーティング
LoginForm.js          - ログインフォーム
RegisterForm.js       - 新規登録フォーム
UserGachaList.js      - 公開ガチャ一覧
UserGachaDetail.js    - ガチャ詳細・実行画面
MyGachaList.js        - マイガチャ一覧 (UserGachaManageを使用)
AdminGachaManage.js   - 管理者ガチャ管理
AdminGachaEdit.js     - 管理者ガチャ編集
UserGachaManage.js    - ユーザーガチャ管理
UserGachaEdit.js      - ユーザーガチャ編集
GachaPerformance.js   - ガチャ実行演出
```

### 状態管理
- React Context API を使用
- 認証状態、ユーザー情報をグローバル管理
- ローカルストレージでトークン永続化

## 権限システム

### ロール定義
- **user**: 一般ユーザー
  - 自分のガチャの作成・編集・削除
  - 公開ガチャの閲覧・実行
- **admin**: 管理者
  - 全ユーザーのガチャ管理
  - システム全体の管理機能

### 権限チェック
- バックエンド: JWT トークンからユーザー情報抽出
- フロントエンド: ユーザー情報に基づくUI制御

## バリデーション

### 新規登録バリデーション (Joi スキーマ)
```javascript
// 新規登録
registerSchema = {
  name: string (2-64文字, 必須) - ユーザー名
  email: string (email形式, 必須) - メールアドレス
  password: string (8文字以上, 英数字必須, 必須) - パスワード
  role: string ('user' または 'admin', デフォルト: 'user') - ロール
}

// ログイン
loginSchema = {
  email: string (email形式, 必須)
  password: string (6文字以上, 必須)
}
```

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

#### 3. ガチャ作成エラー
- **症状**: "Not Found" エラー
- **原因**: 認証トークンの問題、APIエンドポイントの不一致
- **解決**: 
  1. ログイン状態確認
  2. APIエンドポイントのパス確認
  3. CORS設定確認

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
     http://localhost:8080/api/gachas/my
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
2. **権限チェック**: ユーザー権限とデータアクセス範囲の整合性確認
3. **バリデーション**: 入力データの検証スキーマ更新（フロントエンド・バックエンド両方）
4. **エラーハンドリング**: 適切なHTTPステータスコードとエラーメッセージ
5. **フィールド名統一**: フロントエンドとバックエンドでフィールド名を統一（例: `name`）

### データベース変更時
1. **マイグレーション**: スキーマ変更はマイグレーションファイルで管理
2. **インデックス**: パフォーマンス影響を考慮したインデックス設計
3. **外部キー**: データ整合性のための外部キー制約

### デプロイ時
1. **環境変数**: 本番環境用の環境変数設定
2. **シークレット**: JWT シークレット、データベースパスワードの適切な管理
3. **HTTPS**: 本番環境では HTTPS 必須

## 変更履歴

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
