# Copilot Instructions for Online Gacha System

## Architecture Overview
- **Monorepo**: `frontend/` (React/MUI), `web/` (Node.js/Fastify), `doc/` (設計ドキュメント)
- **Frontend**: React 18, Material-UI, Framer Motion, React Router, Swiper.js
- **Backend**: Node.js, Fastify, JWT認証, Joiバリデーション, PostgreSQL, MinIO (S3互換)
- **DB**: PostgreSQL 16, see `doc/TableDefinition.md` for schema
- **Storage**: MinIO for image uploads, managed via backend utils

## Key Patterns & Conventions
- **API設計**: RESTful, `/api/gachas` (公開), `/api/my/gachas` (認証・所有者用), `/api/auth` (認証)
- **認証**: JWT (HTTPOnly Cookie)、全ユーザー平等アクセス、管理者ロールなし
- **ガチャ管理**: 所有者のみ編集・削除可、公開/非公開切替はPATCH
- **画像管理**: 複数画像・順序・メイン画像指定、MinIO連携
- **バリデーション**: Joi (backend), Yup (frontend)
- **ページネーション**: API/フロント両対応、`pagination`オブジェクトで返却
- **エラーハンドリング**: 日本語メッセージ、APIは`error`キーで返却
- **URL設計**: React Routerでパラメータ分離 (`/gacha/:id`, `/my-gacha/edit/:id`)

## Developer Workflows
- **ビルド/起動**: `make install-all` → `docker compose up -d --build` → `make migrate` → `make seed`
- **開発サーバ**: Docker Composeで `frontend`/`web` サービスが自動でホットリロード対応。個別に `docker compose exec frontend npm install` などで依存解決。
- **DBマイグレーション**: `make migrate`、サンプルデータ: `make seed`
- **ログ確認**: `make logs` or `docker compose logs <service>`
- **テスト**: (未整備、API/DB操作はcurlやPostmanで手動確認)

## Integration Points
- **API通信**: `frontend/src/utils/api.js` で全APIをラップ
- **画像アップロード**: MinIO連携は `web/src/utils/minio.js` 経由
- **DB接続**: `web/src/config/database.js`、SQLは`models/`で直接記述
- **認証ミドルウェア**: `web/src/middleware/auth.js` (`fastify.authenticate`)

## Project-Specific Notes
- **全ユーザーがガチャ作成・管理可能** (role不要)
- **ガチャ画像は最大10MB/JPEG,PNG,GIF**
- **APIレスポンス例・設計詳細は `doc/` 配下参照**
- **未実装機能**: ガチャ演出・履歴・プロフィール管理

## 参考ファイル
- `frontend/src/utils/api.js` (API呼び出し)
- `web/src/routes/admin.js`, `gacha.js` (API実装)
- `web/src/models/Gacha.js` (DBロジック)
- `doc/DetailedDesign/` (画面・API設計)
- `README.md` (全体像・コマンド)

---

- **AIエージェントは上記構造・慣習を厳守し、既存API/設計に沿った提案・修正を行うこと**
- **新規APIやDB変更時は `doc/` 設計も必ず更新すること**
