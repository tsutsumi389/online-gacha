# ユーザー用 ガチャ一覧画面 詳細設計（実装同期版）

## 1. 画面概要
- 全ユーザーが利用可能な「公開中」ガチャの一覧を閲覧できる画面
- 各ガチャの詳細画面やガチャ実行画面への遷移が可能
- 在庫数はSSEでリアルタイム反映
- **URL**: `/gacha`
- **遷移先**: ガチャ詳細画面 (`/gacha/:id`)

## 2. 主な機能
- 公開ガチャ一覧表示（カード形式、在庫数はSSEでリアルタイム反映）
- 検索・絞り込み（ガチャ名、説明）
- フィルター機能（すべて、在庫あり、終了が近い）【実装済】
- ソート機能（人気順、評価順、価格順、新着順）【実装済】
- お気に入り機能（未実装）
- ガチャ詳細ボタン（URL遷移: `/gacha/:id`）
- ガチャを引くボタン（認証必須）
- レスポンシブデザイン対応

## 3. UI/UX特徴
- Material-UI + Framer Motionによるモダンデザイン
- 画像スライダー（Swiper.js）
- レスポンシブ画像表示（Sharp.js処理済み、AVIF/WebP/JPEG自動選択）
- レアリティ表示
- 在庫状況プログレスバー（SSEによるリアルタイム反映）
- 評価・レビュー表示（未実装）
- 残り時間表示
- アニメーション効果

## 4. 表示データ項目
- **ガチャ名**: gachas.name
- **説明**: gachas.description
- **価格**: gachas.price
- **作成者**: creator_name
- **作成者アイコン**: creator_avatar_url（64px AVIF, 表示は32px）
- **評価**: rating（未実装）
- **プレイ数**: play_count
- **画像**: 複数画像対応（レスポンシブ表示、AVIF/WebP/JPEG自動選択）
- **レアリティ構成**: gacha_items.rarity（詳細画面で表示、一覧では省略可）
- **在庫状況**: SSEでリアルタイム更新
- **公開期間**: gachas.display_from ～ gachas.display_to
- **詳細ボタン**: ガチャ詳細画面へ遷移
- **引くボタン**: ガチャ実行画面へ遷移

## 5. API設計・SSE連携
- **GET /api/gachas** ... 公開ガチャ一覧取得（検索・絞り込み・ソート・ページネーション対応）【実装済】
  - クエリパラメータ：
    - search: 検索キーワード（ガチャ名、説明）
    - filter: フィルター（all, inStock, endingSoon）
    - sortBy: ソート項目（name, price, created_at, popularity, rating）
    - sortOrder: ソート順（asc, desc）
    - page, limit: ページネーション
  - レスポンス例：
    ```json
    {
      "gachas": [
        {
          "id": 1,
          "name": "ガチャ名",
          "description": "説明",
          "price": 300,
          "is_public": true,
          "created_at": "2025-08-21T12:00:00.000Z",
          "updated_at": "2025-08-21T12:00:00.000Z",
          "creator_name": "作成者名",
          "creator_avatar_url": "https://minio:9000/gacha-images/user-avatars/users/1/avatar_64.avif",
          "item_count": "3",
          "play_count": "0"
        }
      ],
      "pagination": {
        "currentPage": 1,
        "totalPages": 1,
        "totalItems": 1,
        "itemsPerPage": 12,
        "hasNext": false,
        "hasPrev": false
      }
    }
    ```

### SSE（Server-Sent Events）による在庫数リアルタイム配信
- **エンドポイント**: `/api/gachas/stock/stream`（実装済）
- クライアントは一覧画面表示時にSSE接続し、全ガチャの在庫数変更イベントを購読
- サーバーは在庫数が変更されたガチャIDと最新在庫数をpush
- クライアントは該当ガチャカードの在庫数UIのみ即時更新
- メッセージ例：
  ```json
  event: stock_update
  data: { "gachaId": 123, "stock": 5 }
  ```

- **GET /api/gachas/popular** ... 人気ガチャ一覧取得【実装済】
  - プレイ回数順でソートされたガチャ一覧を返す

- **GET /api/gachas/stats** ... ガチャ統計情報取得【実装済】
  - レスポンス例：
    ```json
    {
      "totalGachas": 6,
      "totalPlays": 0,
      "uniquePlayers": 0
    }
    ```

- **GET /api/gachas/:id** ... ガチャ詳細取得（アイテム情報含む）【未実装】

## 5.1 検索機能の仕様
- **対応文字**: 英語・日本語対応
- **検索対象**: ガチャ名（gachas.name）、説明（gachas.description）
- **エンコーディング**: URLエンコード必須（日本語検索時）
- **例**: `?search=%E7%94%B0%E4%B8%AD` （「田中」をURLエンコード）
- **フロントエンド実装時**: `encodeURIComponent()`を使用

## 5.2 ソート機能の仕様
- **対応項目**: 
  - `name`: ガチャ名順
  - `price`: 価格順
  - `created_at`: 作成日時順（デフォルト）
  - `popularity`: 人気順（プレイ回数）
  - `rating`: 評価順（未実装）
- **ソート順**: `asc`（昇順）, `desc`（降順、デフォルト）

## 5.3 ユーザーアイコン機能の仕様【実装済】
- **バックエンド実装**:
  - Gachaモデル `findActiveWithFilters()`/`getPopular()` でアイコン情報をJOIN取得
  - SQLクエリで `user_avatar_images`・`user_avatar_variants` テーブルをJOIN
  - レスポンスに `creator_avatar_url` フィールドを追加

- **フロントエンド実装**:
  - `gacha.creator_avatar_url` プロパティを使用してアバター表示
  - Material-UI `Avatar` コンポーネントで32px×32pxサイズ表示
  - アイコン未設定時は作成者名の頭文字をフォールバック表示

- **画像仕様**:
  - 64px サイズのAVIF形式画像を使用（表示は32px）
  - Sharp.js による高品質・高圧縮変換
  - MinIO S3互換ストレージから配信

## 6. バリデーション・UX
- ローディング状態の表示
- エラーハンドリング（APIエラー、ネットワークエラー）
- 空データ時の適切なメッセージ
- 画像未設定時のフォールバック表示
- レスポンシブ対応（スマホ・タブレット・PC）
- レスポンシブ画像配信（デバイスサイズ・ブラウザサポートに応じた最適画像選択）
- 画像遅延読み込み（Intersection Observer API）
- アクセシビリティ配慮（ARIA属性、キーボード操作）

## 7. 権限制御【実装済】
- 全ユーザーが一覧閲覧可能（認証不要）
- 「ガチャを引く」ボタンは認証必須
- 公開されたガチャのみ表示（is_public = true）
- 公開期間内のガチャのみ表示（display_from ～ display_to）
- 作成者情報の取得（usersテーブルとJOIN）
- 作成者アイコン情報の取得（user_avatar_imagesテーブルとuser_avatar_variantsテーブルJOIN）

### 7.1 作成者アイコン表示仕様【実装済】
- **取得データ**: user_avatar_variants.image_url (size_type='avatar_64')
- **表示サイズ**: 32px × 32px（Material-UI Avatar コンポーネント）
- **形式**: AVIF形式（Sharp.js処理済み）
- **フォールバック**: アイコン未設定時は作成者名の頭文字を表示
- **データベース構造**:
  ```sql
  LEFT JOIN user_avatar_images uai ON u.avatar_image_id = uai.id
  LEFT JOIN user_avatar_variants uav_64 ON uai.id = uav_64.user_avatar_image_id 
    AND uav_64.size_type = 'avatar_64'
  ```

## 8. 技術仕様
- **フロントエンド**: React 18 + Material-UI v5
- **状態管理**: React Hooks（useState, useEffect）
- **API通信**: Fetch API with utils/api.js
- **アニメーション**: Framer Motion
- **画像表示**: Swiper.js + レスポンシブ画像選択ロジック
- **画像最適化**: Sharp.js処理済み画像（AVIF/WebP/JPEG、4サイズ対応）
- **ユーザーアイコン**: Sharp.js処理済みAVIF画像（32px/64px/128px/256px）
- **レスポンシブ**: Material-UI Grid System + Picture要素

### 8.1 ユーザーアイコン技術詳細【実装済】
- **画像処理**: Sharp.js による自動リサイズ・AVIF変換
- **ストレージ**: MinIO S3互換ストレージ
- **オブジェクトキー**: `user-avatars/users/{userId}/{timestamp}_{uuid}_avatar_64.avif`
- **表示コンポーネント**: Material-UI Avatar
- **フロントエンド実装**: `gacha.creator_avatar_url` プロパティを使用
- **エラーハンドリング**: 画像読み込み失敗時は頭文字フォールバック

## 9. エラーハンドリング
- ネットワークエラー時の再試行機能
- APIエラー時のユーザーフレンドリーなメッセージ
- データ欠損時の適切なフォールバック表示
- 画像読み込みエラー時の代替表示

## 10. パフォーマンス考慮
- 画像遅延読み込み（Intersection Observer API）
- レスポンシブ画像配信（Picture要素 + srcset）
- AVIF/WebP対応ブラウザでの高圧縮画像配信
- **ユーザーアイコンAVIF配信**（50%以上の圧縮率向上）
- 仮想スクロール（大量データ対応、未実装）
- APIレスポンスキャッシュ
- 検索デバウンス処理
- メモ化によるレンダリング最適化
  - SSE接続の効率化（一覧画面表示中のみ購読、画面遷移時は切断）
  - 在庫数のみ差分更新で再レンダリング最小化

## 11. 今後の拡張予定
- 無限スクロール対応
- お気に入り機能
- 評価・レビュー機能
- より詳細なフィルタリング（価格帯、レアリティ）
- ソーシャル機能（シェア、コメント）
- パーソナライズド推奨機能
- 多言語対応

---
