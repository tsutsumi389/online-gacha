# ユーザー用 ガチャ一覧画面 詳細設計 ✅ URL分離完了

## 1. 画面概要
- 全ユーザーが利用可能な公開ガチャの一覧を閲覧できる画面
- 各ガチャの詳細画面やガチャ実行画面への遷移が可能
- リアルタイムAPI統合によるデータ表示
- **URL**: `/gacha`
- **遷移先**: ガチャ詳細画面 (`/gacha/:id`)

## 2. 主な機能
- 公開ガチャ一覧表示（カード形式）
- 検索・絞り込み（ガチャ名、作成者名）
- カテゴリ別フィルタリング
- ソート機能（人気順、評価順、価格順、新着順）
- お気に入り機能
- ガチャ詳細ボタン（URL遷移: `/gacha/:id`）
- ガチャを引くボタン
- レスポンシブデザイン対応

## 3. UI/UX特徴
- Material-UI + Framer Motionによるモダンデザイン
- 画像スライダー（Swiper.js）
- レスポンシブ画像表示（Sharp.js処理済み、AVIF/WebP/JPEG自動選択）
- レアリティ表示
- 在庫状況プログレスバー
- 評価・レビュー表示
- 残り時間表示
- アニメーション効果

## 4. 表示データ項目
- **ガチャ名**: gachas.name
- **説明**: gachas.description
- **価格**: gachas.price
- **作成者**: users.name（作成者情報）
- **評価**: 集計データ（rating）
- **プレイ数**: 集計データ（totalPlays）
- **画像**: 複数画像対応（レスポンシブ表示、AVIF/WebP/JPEG自動選択）
- **レアリティ構成**: gacha_items.rarity
- **在庫状況**: gacha_items.stock
- **公開期間**: gachas.display_from ～ gachas.display_to
- **詳細ボタン**: ガチャ詳細画面へ遷移
- **引くボタン**: ガチャ実行画面へ遷移

## 5. API設計
- **GET /api/gachas** ... 公開ガチャ一覧取得（検索・絞り込み対応）**【✅ 実装完了】**
  - クエリパラメータ：
    - search: 検索キーワード（ガチャ名、説明）**【✅ 実装完了】**
    - sortBy: ソート項目（name, price, created_at, popularity, rating）**【✅ 実装完了】**
    - sortOrder: ソート順（asc, desc）**【✅ 実装完了】**
    - page, limit: ページネーション**【✅ 実装完了】**
  - レスポンス形式：
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

- **GET /api/gachas/categories** ... カテゴリ一覧取得**【✅ 実装完了】**
  - 現在は空配列を返す（将来拡張予定）

- **GET /api/gachas/popular** ... 人気ガチャ一覧取得**【✅ 実装完了】**
  - プレイ回数順でソートされたガチャ一覧を返す

- **GET /api/gachas/stats** ... ガチャ統計情報取得**【✅ 実装完了】**
  - レスポンス形式：
    ```json
    {
      "totalGachas": 6,
      "totalPlays": 0,
      "uniquePlayers": 0
    }
    ```

- **GET /api/gachas/:id** ... ガチャ詳細取得（アイテム情報含む）**【🚧 未実装】**

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
  - `rating`: 評価順（将来実装）
- **ソート順**: `asc`（昇順）, `desc`（降順、デフォルト）

## 6. バリデーション・UX
- ローディング状態の表示
- エラーハンドリング（APIエラー、ネットワークエラー）
- 空データ時の適切なメッセージ
- 画像未設定時のフォールバック表示
- レスポンシブ対応（スマホ・タブレット・PC）
- レスポンシブ画像配信（デバイスサイズ・ブラウザサポートに応じた最適画像選択）
- 画像遅延読み込み（Intersection Observer API）
- アクセシビリティ配慮（ARIA属性、キーボード操作）

## 7. 権限制御**【✅ 実装完了】**
- 全ユーザーが一覧閲覧可能（認証不要）
- 「ガチャを引く」ボタンは認証必須
- 公開されたガチャのみ表示（is_public = true）
- 公開期間内のガチャのみ表示（display_from ～ display_to）**【🚧 部分実装】**
- 作成者情報の取得（usersテーブルとJOIN）**【✅ 実装完了】**

## 8. 技術仕様
- **フロントエンド**: React 18 + Material-UI v5
- **状態管理**: React Hooks（useState, useEffect）
- **API通信**: Fetch API with utils/api.js
- **アニメーション**: Framer Motion
- **画像表示**: Swiper.js + レスポンシブ画像選択ロジック
- **画像最適化**: Sharp.js処理済み画像（AVIF/WebP/JPEG、4サイズ対応）
- **レスポンシブ**: Material-UI Grid System + Picture要素

## 9. エラーハンドリング
- ネットワークエラー時の再試行機能
- APIエラー時のユーザーフレンドリーなメッセージ
- データ欠損時の適切なフォールバック表示
- 画像読み込みエラー時の代替表示

## 10. パフォーマンス考慮
- 画像遅延読み込み（Intersection Observer API）
- レスポンシブ画像配信（Picture要素 + srcset）
- AVIF/WebP対応ブラウザでの高圧縮画像配信
- 仮想スクロール（大量データ対応）
- APIレスポンスキャッシュ
- 検索デバウンス処理
- メモ化によるレンダリング最適化

## 11. 今後の拡張予定
- 無限スクロール対応
- より詳細なフィルタリング（価格帯、レアリティ）
- ソーシャル機能（シェア、コメント）
- パーソナライズド推奨機能
- 多言語対応

---
