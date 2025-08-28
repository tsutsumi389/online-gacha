# Online Gacha System

## プロジェクト概要・特徴
オンラインでガチャを作成・管理・実行できるWebアプリケーション。全ユーザーがガチャの作成・管理・実行を行えます。

## 主要な機能一覧
- ユーザー登録・ログイン/ログアウト
- プロフィール編集・アバター画像管理
- 公開ガチャの閲覧・詳細表示・ガチャ実行（SSE対応）
- マイガチャの作成・編集・削除・画像/アイテム管理
- ガチャ画像の複数アップロード・順序変更・メイン画像指定
- ページネーション・リアルタイム在庫反映

## 技術スタック
- React 18, Material-UI, Framer Motion, React Router, Swiper.js
- Node.js, Fastify, JWT, Joi, bcrypt
- PostgreSQL 16, MinIO (S3互換, 画像4サイズAVIF/WebP/JPEG)
- Docker Compose, Sharp.js

## セットアップ手順（最小限）
```bash
make install-all
docker compose up -d --build
make migrate
make seed
```

## 主要なURL構造
- `/gacha` : 公開ガチャ一覧
- `/gacha/:id` : ガチャ詳細
- `/my-gacha` : マイガチャ管理
- `/my-gacha/edit/:id` : ガチャ編集
- `/my-gacha/new` : 新規ガチャ作成
- `/profile` : プロフィール管理

## 主要な開発コマンド
```bash
make install-all      # 依存関係インストール（web+frontend）
make migrate          # DBマイグレーション
make seed             # サンプルデータ投入
make logs             # 全サービスのログ確認
make clean            # コンテナ・ボリューム完全削除
make docker-up        # Dockerサービス起動
make install-web      # バックエンド依存インストール
make install-frontend # フロントエンド依存インストール
make docker-sh        # webコンテナにシェル接続
make migrate-status   # マイグレーション状況確認
make migrate-down     # マイグレーションロールバック
make migrate-check    # 画像処理進捗・マイグレーション確認
```
