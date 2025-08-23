# Sharp.js画像処理システム マイグレーション実行ガイド

## 概要

Makefileを使用してSharp.js画像処理システムのマイグレーションを実行する手順です。

## 作成されたマイグレーションファイル

### 1. `1640995200000_sharp-js-image-system.js`
- Sharp.js対応の新しいテーブル構造を作成
- 既存のガチャ画像データを自動バックアップ
- 複数サイズ・フォーマット対応の画像管理システム

### 2. `1640995300000_image-processing-utilities.js`
- 画像処理監視用のビューと関数を作成
- メンテナンス用ユーティリティ関数
- パフォーマンス最適化インデックス

## 実行手順

### 1. 事前準備

#### Dockerサービス起動
```bash
make docker-up
```

#### 依存関係インストール（Sharp.js含む）
```bash
make install-web
```

#### 現在のマイグレーション状況確認
```bash
make migrate-status
```

### 2. Sharp.js マイグレーション実行

#### 専用コマンドで実行（推奨）
```bash
make migrate-sharp
```

#### 個別に実行する場合
```bash
# すべてのマイグレーション実行
make migrate

# または手動で特定のマイグレーション実行
docker compose exec web npm run migrate -- up 1640995200000
docker compose exec web npm run migrate -- up 1640995300000
```

### 3. 実行後の確認

#### マイグレーション状況とシステム状態確認
```bash
make migrate-check
```

#### 詳細確認
```bash
# コンテナに接続
make docker-sh

# データベースに接続
psql $DATABASE_URL

# テーブル構造確認
\dt gacha_images
\dt image_variants
\dt item_images
\dt item_image_variants

# ビュー確認
\dv v_image_processing_status
\dv v_image_usage_status

# 関数確認
\df retry_failed_image_processing
\df get_image_processing_progress

# 画像処理進捗確認
SELECT * FROM get_image_processing_progress();

# 画像統計確認
SELECT * FROM get_image_size_statistics();
```

## 利用可能なMakeコマンド

### 基本マイグレーション
- `make migrate` - すべての未実行マイグレーションを実行
- `make migrate-status` - マイグレーション状況表示
- `make migrate-down` - 最後のマイグレーションをロールバック

### Sharp.js専用
- `make migrate-sharp` - Sharp.js関連マイグレーションのみ実行
- `make migrate-check` - マイグレーション状況と画像処理進捗を確認

### システム管理
- `make setup` - 完全セットアップ（docker-up + install-all + migrate + seed）
- `make docker-up` - Dockerサービス起動
- `make docker-sh` - Webコンテナシェルアクセス

## トラブルシューティング

### よくある問題と解決方法

#### 1. Sharp.jsインストールエラー
```bash
# コンテナ内で手動インストール
make docker-sh
npm install sharp@^0.33.5
```

#### 2. マイグレーション失敗
```bash
# 状況確認
make migrate-status

# 失敗したマイグレーションのロールバック
make migrate-down

# 再実行
make migrate-sharp
```

#### 3. 既存データの確認
```bash
# バックアップテーブル確認
make docker-sh
psql $DATABASE_URL -c "SELECT COUNT(*) FROM gacha_images_backup;"

# 新しいテーブル確認
psql $DATABASE_URL -c "SELECT COUNT(*) FROM gacha_images;"
```

### 緊急時のロールバック

```bash
# 最新マイグレーションをロールバック
make migrate-down

# 特定のマイグレーションまでロールバック
docker compose exec web npm run migrate -- down --to 1640995100000
```

## パフォーマンス監視

### 定期実行推奨コマンド

```bash
# 日次: 処理進捗確認
make migrate-check

# 週次: 詳細統計確認
make docker-sh
psql $DATABASE_URL -c "
SELECT 
    size_type, 
    format_type, 
    pg_size_pretty(total_file_size::bigint) as total_size,
    image_count
FROM get_image_size_statistics()
ORDER BY size_type, format_type;
"

# 月次: 孤立画像確認
psql $DATABASE_URL -c "
SELECT 
    COUNT(*) as orphaned_count,
    pg_size_pretty(SUM(total_file_size)::bigint) as wasted_space
FROM find_orphaned_images();
"
```

## 注意事項

1. **バックアップ**: マイグレーション実行前に必ずデータベースのバックアップを取得
2. **ダウンタイム**: マイグレーション中はアプリケーションを停止
3. **ストレージ容量**: Sharp.js処理により画像ファイル数が12倍になるため、十分な容量を確保
4. **処理時間**: 既存画像が多い場合、マイグレーション完了まで時間がかかる場合があります

## 成功確認チェックリスト

- [ ] `make migrate-status` でマイグレーション完了確認
- [ ] `SELECT * FROM get_image_processing_progress();` で処理状況確認
- [ ] 新しいテーブル（gacha_images, image_variants, item_images, item_image_variants）の存在確認
- [ ] 既存のガチャ一覧・詳細画面の正常表示確認
- [ ] 新規画像アップロード機能の動作確認

## サポート

問題が発生した場合は、以下の情報を収集してください：

1. `make migrate-status` の出力
2. エラーメッセージの全文
3. `SELECT * FROM get_image_processing_progress();` の結果
4. PostgreSQLログ（必要に応じて）
