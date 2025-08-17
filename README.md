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
- **ガチャ一覧**: 公開中のガチャ一覧表示
- **ガチャ詳細**: ガチャの詳細情報とアイテム確認
- **ガチャ実行**: 1回または複数回のガチャ実行
- **ガチャ演出**: モダンなアニメーション付きガチャ演出

### 🛠️ 管理者機能
- **ガチャ管理**: ガチャの作成・編集・削除
- **アイテム管理**: ガチャアイテムの設定・在庫管理
- **ユーザー管理**: ユーザーアカウントの管理

## 🛠️ 技術スタック

### フロントエンド
- **React 18**: UIライブラリ
- **Material-UI (MUI)**: UIコンポーネント
- **Framer Motion**: アニメーション
- **React Hook Form**: フォーム管理
- **Yup**: バリデーション

### バックエンド
- **Node.js**: ランタイム環境
- **Fastify**: Webフレームワーク
- **JWT**: 認証トークン
- **bcrypt**: パスワードハッシュ化
- **Joi**: サーバーサイドバリデーション

### データベース
- **PostgreSQL 16**: メインデータベース

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

## 📖 使用方法

### 基本的な使い方

1. **ユーザー登録**
   - http://localhost:3000/register でアカウント作成

2. **ログイン**
   - http://localhost:3000/login でログイン

3. **ガチャを楽しむ**
   - ガチャ一覧から好きなガチャを選択
   - ガチャ詳細でアイテムを確認
   - ガチャを実行してアイテムを獲得

### 管理者機能の使用

1. **管理者権限でログイン**
   - 管理者アカウントでログイン

2. **ガチャ管理**
   - マイガチャページでガチャの作成・編集・削除

## 🔌 API仕様

### 認証関連
\`\`\`
POST /api/auth/register   # ユーザー登録
POST /api/auth/login      # ログイン
POST /api/auth/logout     # ログアウト
GET  /api/auth/me         # ユーザー情報取得
POST /api/auth/change-password  # パスワード変更
\`\`\`

### ガチャ関連
\`\`\`
GET  /api/gachas          # ガチャ一覧取得
GET  /api/gachas/:id      # ガチャ詳細取得
POST /api/gachas/:id/draw # ガチャ実行（認証必要）
\`\`\`

## 📁 プロジェクト構造

\`\`\`
online-gacha/
├── doc/                          # 設計ドキュメント
├── frontend/                     # Reactフロントエンド
│   ├── src/
│   │   ├── components/          # 再利用可能コンポーネント
│   │   ├── UserGachaList.js     # ガチャ一覧画面
│   │   ├── UserGachaDetail.js   # ガチャ詳細画面
│   │   ├── GachaPerformance.js  # ガチャ演出画面
│   │   ├── LoginForm.js         # ログイン画面
│   │   ├── MyGachaList.js       # マイガチャ管理画面
│   │   └── AdminGachaManage.js  # ガチャ管理画面
│   └── public/
├── web/                          # Node.js/Fastifyバックエンド
│   ├── src/
│   │   ├── config/              # 設定ファイル
│   │   ├── middleware/          # ミドルウェア
│   │   ├── routes/              # API ルート
│   │   ├── models/              # データモデル
│   │   ├── utils/               # ユーティリティ
│   │   └── schemas/             # バリデーションスキーマ
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
- id: ユーザーID
- name: ユーザー名
- email: メールアドレス
- password: ハッシュ化されたパスワード
- role: ユーザー権限 ('user' | 'admin')
- created_at, updated_at: タイムスタンプ
\`\`\`

#### gachas テーブル
\`\`\`sql
- id: ガチャID
- name: ガチャ名
- description: 説明
- price: 価格
- user_id: 作成者ID
- is_public: 公開状態
- display_from, display_to: 表示期間
- created_at, updated_at: タイムスタンプ
\`\`\`

#### gacha_items テーブル
\`\`\`sql
- id: アイテムID
- gacha_id: 所属ガチャID
- name: アイテム名
- description: 説明
- image_url: 画像URL
- stock: 現在在庫数
- is_public: 公開状態
- created_at, updated_at: タイムスタンプ
\`\`\`

### セキュリティ考慮事項

- **JWT認証**: HTTPOnlyクッキーでトークン管理
- **パスワードハッシュ化**: bcryptで12 salt rounds
- **入力バリデーション**: フロントエンド・バックエンド両方で実装
- **CORS設定**: フロントエンドからのアクセスのみ許可

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
   \`\`\`

3. **認証エラー**
   \`\`\`bash
   # JWT設定の確認
   cat web/.env | grep JWT_SECRET
   
   # クッキーのクリア（ブラウザ）
   \`\`\`

4. **フロントエンドが表示されない**
   \`\`\`bash
   # フロントエンドコンテナの確認
   docker compose logs frontend
   
   # 依存関係の再インストール
   make install
   \`\`\`

### ログの確認方法

\`\`\`bash
# 全サービスのログ
make logs

# 特定サービスのログ
docker compose logs web
docker compose logs frontend
docker compose logs db
\`\`\`
