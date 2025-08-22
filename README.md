# Online Gacha System

オンラインガチャシステムは、ユーザーがガチャを楽しめるWebアプリケーションです。React（フロントエンド）、Node.js/Fastify（バックエンド）、PostgreSQL（データベース）を使用したフルスタックアプリケーションです。

## 📋 目次

- [機能概要](#機能概要)
- [技術スタック](#技術スタック)
- [システム要件](#システム要件)
- [インストール・セットアップ](#インストールセットアップ)
- [使用方法](#使用方法)
- [API仕様](#api仕様)
- [プロジェクト構造](#プロジェクト構造)
- [開発者向け情報](#開発者向け情報)
- [トラブルシューティング](#トラブルシューティング)

## 🎯 機能概要

### 👤 ユーザー機能
- **ユーザー認証**: 新規登録・ログイン・ログアウト
- **ガチャ一覧**: 公開中のガチャ一覧表示 (`/gacha`)
- **ガチャ詳細**: ガチャの詳細情報とアイテム確認 (`/gacha/:id`)
- **ガチャ実行**: 1回または複数回のガチャ実行
- **ガチャ演出**: モダンなアニメーション付きガチャ演出

### 🛠️ ガチャ管理機能
- **マイガチャ管理**: 自分のガチャの一覧・管理 (`/my-gacha`)
- **ガチャ新規作成**: 新しいガチャの作成 (`/my-gacha/new`)
- **ガチャ編集**: 既存ガチャの編集・アイテム管理 (`/my-gacha/edit/:id`)
- **ガチャ画像管理**: 複数画像のアップロード・削除・順序変更・メイン画像設定
- **アイテム管理**: ガチャアイテムの設定・在庫管理
- **公開状態管理**: ガチャの公開/非公開の即座切り替え
- **ページネーション**: ガチャ一覧のページング機能
- **マルチ画像表示**: ガチャ一覧での複数画像スライド表示

**注意**: すべてのユーザーは同等の権限を持ち、ガチャの作成と実行の両方が可能です。

## 🛠️ 技術スタック

### フロントエンド
- **React 18**: UIライブラリ
- **Material-UI (MUI)**: UIコンポーネント
- **Framer Motion**: アニメーション
- **React Router**: ページルーティング
- **Swiper.js**: 画像スライド表示

### バックエンド
- **Node.js**: ランタイム環境
- **Fastify**: 高速Webフレームワーク
- **JWT**: 認証トークン（HTTPOnly Cookie）
- **bcrypt**: パスワードハッシュ化
- **Joi**: サーバーサイドバリデーション

### データベース・ストレージ
- **PostgreSQL 16**: メインデータベース
- **MinIO**: S3互換オブジェクトストレージ（画像管理）

### インフラ・開発環境
- **Docker & Docker Compose**: コンテナ化
- **Git**: バージョン管理

## 💻 システム要件

- **Docker**: 20.10.0以上
- **Docker Compose**: 2.0.0以上
- **Node.js**: 18.0.0以上（ローカル開発時）
- **npm**: 8.0.0以上（ローカル開発時）

## 🚀 インストール・セットアップ

### 1. リポジトリのクローン
\`\`\`bash
git clone https://github.com/tsutsumi389/online-gacha.git
cd online-gacha
\`\`\`

### 2. 環境変数の設定
\`\`\`bash
# .env.exampleをコピーして.envを作成
cp .env.example .env
cp web/.env.example web/.env

# 必要に応じて環境変数を編集
vim web/.env
\`\`\`

### 3. Dockerでの起動
\`\`\`bash
# 依存関係のインストール
make install

# コンテナのビルドと起動
docker compose up -d --build

# データベースマイグレーション
make migrate

# サンプルデータの投入
make seed
\`\`\`

### 4. アクセス確認
- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8080
- **データベース**: localhost:5432
- **MinIO**: http://localhost:9000 (Admin UI: http://localhost:9001)

## 📖 使用方法

### 基本的な使い方

1. **ユーザー登録**
   - http://localhost:3000/register でアカウント作成

2. **ログイン**
   - http://localhost:3000/login でログイン

3. **ガチャを引く**
   - http://localhost:3000/gacha でガチャ一覧表示
   - 詳細を見たいガチャをクリック (`/gacha/:id`)
   - ガチャ詳細画面でガチャを実行

4. **ガチャ管理**
   - http://localhost:3000/my-gacha で自分のガチャを管理
   - 新規ガチャ作成・編集・削除が可能
   - アイテム管理機能でガチャの内容を設定
   - ガチャ画像のアップロード・管理機能
   - 複数画像のスライド表示対応

### URL構造
```
/gacha              # ガチャ一覧画面
/gacha/:id          # ガチャ詳細画面
/my-gacha           # マイガチャ管理画面
/my-gacha/new       # ガチャ新規作成画面
/my-gacha/edit/:id  # ガチャ編集画面
/login              # ログイン画面
/register           # 新規登録画面
```

### ガチャ管理機能の使用

1. **ガチャ作成**
   - マイガチャ管理画面 (`/my-gacha`) から「新規ガチャ作成」をクリック
   - 新規作成画面 (`/my-gacha/new`) でガチャ名、説明、価格、公開設定等を入力
   - 作成後、自動的にガチャ編集画面 (`/my-gacha/edit/:id`) に遷移
   - アイテム管理セクションが表示される

2. **アイテム管理**
   - ガチャ編集画面で「アイテム追加」でガチャ内容を設定
   - アイテム名、説明、在庫数、画像URLを設定

3. **ガチャ画像管理**
   - ガチャ編集画面で画像のドラッグ&ドロップアップロード
   - 複数画像の管理（最大10MB、JPEG/PNG/GIF対応）
   - 画像の表示順序変更とメイン画像設定
   - 画像削除機能
   - ガチャ一覧での自動スライド表示（3秒間隔）

## 🔌 API仕様

### 認証関連
```
POST /api/auth/register   # ユーザー登録
POST /api/auth/login      # ログイン
POST /api/auth/logout     # ログアウト
GET  /api/auth/me         # ユーザー情報取得
```

### ガチャ閲覧・実行
```
GET  /api/gachas          # 公開ガチャ一覧取得
GET  /api/gachas/:id      # ガチャ詳細取得
POST /api/gachas/:id/draw # ガチャ実行
```

### ガチャ管理関連
```
GET  /api/my/gachas                           # 自分のガチャ一覧取得
POST /api/my/gachas                           # ガチャ新規作成
PUT  /api/my/gachas/:id                       # ガチャ編集
DELETE /api/my/gachas/:id                     # ガチャ削除
PATCH /api/my/gachas/:id/public               # 公開状態切り替え
GET  /api/my/gachas/:id/items                 # アイテム一覧取得
POST /api/my/gachas/:id/items                 # アイテム追加
PUT  /api/my/gachas/:gachaId/items/:itemId    # アイテム編集
DELETE /api/my/gachas/:gachaId/items/:itemId  # アイテム削除
```

### ガチャ画像管理関連
```
GET  /api/my/gachas/:id/images                # ガチャ画像一覧取得
POST /api/my/gachas/:id/images                # ガチャ画像アップロード
DELETE /api/my/gachas/:id/images/:imageId     # ガチャ画像削除
PUT  /api/my/gachas/:id/images/:imageId/main  # メイン画像設定
PUT  /api/my/gachas/:id/images/order          # 画像表示順序更新
```

### ガチャ実行関連（未実装）
\`\`\`
GET  /api/gachas          # 公開ガチャ一覧取得
GET  /api/gachas/:id      # ガチャ詳細取得
POST /api/gachas/:id/draw # ガチャ実行（認証必要）
\`\`\`

## 📁 プロジェクト構造

\`\`\`
online-gacha/
├── doc/                          # 設計ドキュメント
│   ├── OnlineGachaBasicDesign.md # 基本設計書
│   ├── TableDefinition.md        # テーブル定義
│   └── DetailedDesign/           # 詳細設計
│       ├── AdminGachaManage.md   # ガチャ管理画面設計
│       └── ...
├── frontend/                     # Reactフロントエンド
│   ├── src/
│   │   ├── App.js               # メインアプリケーション
│   │   ├── UserGachaList.js     # ガチャ一覧画面（部分実装）
│   │   ├── UserGachaDetail.js   # ガチャ詳細画面（部分実装）
│   │   ├── GachaPerformance.js  # ガチャ演出画面（部分実装）
│   │   ├── LoginForm.js         # ログイン画面
│   │   ├── RegisterForm.js      # 新規登録画面
│   │   ├── AdminGachaManage.js  # ガチャ管理一覧画面
│   │   ├── AdminGachaEdit.js    # ガチャ編集・作成画面
│   │   ├── utils/
│   │   │   └── api.js           # API通信ユーティリティ
│   │   └── theme.js             # Material-UIテーマ
│   └── public/
├── web/                          # Node.js/Fastifyバックエンド
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js      # データベース設定
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT認証ミドルウェア
│   │   ├── routes/
│   │   │   ├── auth.js          # 認証API
│   │   │   ├── admin.js         # ガチャ管理API
│   │   │   └── gacha.js         # ガチャ実行API（部分実装）
│   │   ├── models/
│   │   │   ├── User.js          # ユーザーモデル
│   │   │   └── Gacha.js         # ガチャモデル
│   │   ├── schemas/
│   │   │   └── validation.js    # Joiバリデーションスキーマ
│   │   └── utils/
│   │       ├── helpers.js       # ヘルパー関数
│   │       └── minio.js         # MinIO設定・ヘルパー
│   ├── migrations/              # データベースマイグレーション
│   └── seeds/                   # サンプルデータ
├── docker-compose.yml           # Docker設定
├── Makefile                     # 開発用コマンド
└── README.md                    # このファイル
\`\`\`

## 🔧 開発者向け情報

### 開発用コマンド

\`\`\`bash
# 依存関係のインストール
make install

# 開発サーバーの起動
make dev

# データベースマイグレーション
make migrate

# サンプルデータの投入
make seed

# コンテナの再起動
make restart

# ログの確認
make logs

# コンテナの停止・削除
make clean
\`\`\`

### データベーススキーマ

#### users テーブル
\`\`\`sql
- id: ユーザーID（SERIAL PRIMARY KEY）
- name: ユーザー名（VARCHAR(64) NOT NULL）
- email: メールアドレス（VARCHAR(255) UNIQUE NOT NULL）
- password_hash: ハッシュ化されたパスワード（VARCHAR(255) NOT NULL）
- created_at, updated_at: タイムスタンプ（TIMESTAMP DEFAULT CURRENT_TIMESTAMP）
\`\`\`

#### gachas テーブル
\`\`\`sql
- id: ガチャID（SERIAL PRIMARY KEY）
- name: ガチャ名（VARCHAR(128) NOT NULL）
- description: 説明（TEXT）
- price: 価格（INTEGER NOT NULL）
- user_id: 作成者ID（INTEGER FOREIGN KEY）
- is_public: 公開状態（BOOLEAN DEFAULT TRUE）
- display_from, display_to: 表示期間（TIMESTAMP）
- created_at, updated_at: タイムスタンプ（TIMESTAMP DEFAULT CURRENT_TIMESTAMP）
\`\`\`

#### gacha_items テーブル
\`\`\`sql
- id: アイテムID（SERIAL PRIMARY KEY）
- gacha_id: 所属ガチャID（INTEGER FOREIGN KEY）
- name: アイテム名（VARCHAR(128) NOT NULL）
- description: 説明（TEXT）
- image_url: 画像URL（VARCHAR(255)）
- stock: 現在在庫数（INTEGER）
- is_public: 公開状態（BOOLEAN DEFAULT TRUE）
- created_at, updated_at: タイムスタンプ（TIMESTAMP DEFAULT CURRENT_TIMESTAMP）
\`\`\`

**注意**: roleカラムやrarityカラムは現在の実装では削除されています。

#### gacha_images テーブル
```sql
- id: 画像ID（SERIAL PRIMARY KEY）
- gacha_id: 所属ガチャID（INTEGER FOREIGN KEY, CASCADE DELETE）
- image_url: 画像URL（VARCHAR(500) NOT NULL）
- display_order: 表示順序（INTEGER DEFAULT 0）
- is_main: メイン画像フラグ（BOOLEAN DEFAULT FALSE）
- created_at, updated_at: タイムスタンプ（TIMESTAMP DEFAULT CURRENT_TIMESTAMP）
```

### セキュリティ考慮事項

- **JWT認証**: HTTPOnlyクッキーでトークン管理
- **パスワードハッシュ化**: bcryptで12 salt rounds
- **入力バリデーション**: フロントエンド・バックエンド両方で実装
- **CORS設定**: フロントエンドからのアクセスのみ許可
- **ファイルアップロード**: 所有者チェック、ファイル形式・サイズ検証
- **MinIOセキュリティ**: 専用バケット、オブジェクトキー管理

## 🔍 トラブルシューティング

### よくある問題

1. **コンテナが起動しない**
   \`\`\`bash
   # ポートの競合確認
   docker compose down
   docker system prune -f
   docker compose up -d --build
   \`\`\`

2. **データベース接続エラー**
   \`\`\`bash
   # データベースコンテナの確認
   docker compose logs db
   
   # マイグレーション再実行
   make migrate
   ```

3. **認証エラー**
   ```bash
   # JWT設定の確認
   cat web/.env | grep JWT_SECRET
   
   # ブラウザのクッキー・ローカルストレージをクリア
   ```

4. **フロントエンドが表示されない**
   ```bash
   # フロントエンドコンテナの確認
   docker compose logs frontend
   
   # 依存関係の再インストール
   make install
   ```

### ログの確認方法

```bash
# 全サービスのログ
make logs

# 特定サービスのログ
docker compose logs web
docker compose logs frontend
docker compose logs db
```

## 📅 更新履歴

### 2025年8月22日 - ガチャ画像管理システム実装
- **ストレージシステム追加**:
  - MinIO S3互換オブジェクトストレージ導入
  - Docker Compose環境への MinIO 統合
  - ガチャ画像専用フォルダ構造実装

- **データベース拡張**:
  - `gacha_images` テーブル追加（画像URL、表示順序、メイン画像フラグ）
  - 外部キー制約とCASCADE DELETE設定

- **フロントエンド機能追加**:
  - ガチャ画像管理UI実装（ドラッグ&ドロップアップロード）
  - マルチ画像スライド表示対応（Swiper.js使用）
  - 画像削除、順序変更、メイン画像設定機能

- **バックエンド機能追加**:
  - ガチャ画像CRUD API エンドポイント実装
  - MinIO連携による画像ストレージ管理
  - マルチパートファイルアップロード対応

- **技術仕様**:
  - ファイル形式: JPEG, PNG, GIF対応
  - ファイルサイズ制限: 10MB
  - セキュリティ: 所有者ベースアクセス制御

### 2025年8月21日 - URL構造分離実装
- ガチャ一覧とガチャ詳細のURL分離: `/gacha` → `/gacha/:id`
- マイガチャ管理とガチャ編集のURL分離: `/my-gacha` → `/my-gacha/edit/:id`
- 新規ガチャ作成の独立URL: `/my-gacha/new`
- React Router による URL パラメータベースのナビゲーション実装
- バックエンドAPI endpoints の修正とバグ修正

### 2025年8月19日 - ロールベース制御撤廃
- 全ユーザーがガチャ作成・管理機能に平等アクセス
- 管理者・ユーザーの区別を完全撤廃
- 認証状態の永続化実装（ページリロード対応）

### 2025年8月18日 - 新規ユーザー登録機能実装
- 実際のAPI呼び出しによる新規登録機能
- パスワード要件強化とバリデーション
- 詳細なエラーハンドリング実装

### 現在の実装状況

✅ **実装完了**
- ユーザー認証（登録・ログイン・ログアウト）
- ガチャ管理（作成・編集・削除・公開状態切り替え）
- ガチャ画像管理（アップロード・削除・順序変更・メイン画像設定）
- アイテム管理（追加・編集・削除）
- ページネーション機能
- JWT認証とHTTPOnly Cookie
- マルチ画像スライド表示

🚧 **部分実装**
- ガチャ一覧表示（ユーザー向け）
- ガチャ詳細表示

❌ **未実装**
- ガチャ実行機能
- ガチャ演出
- プロフィール管理
- ガチャ実行履歴
