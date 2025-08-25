# ユーザー用 ガチャ詳細画面 詳細設計 ✅ 実装完了・URL分離完了

## 1. 画面概要
- 選択したガチャの詳細情報を表示する画面
- ガチャ内の全商品リスト・各商品の残り数・画像を表示
- 「1回引く」「10連引く」ボタンを配置
- **URL**: `/gacha/:id` （URL パラメータからガチャIDを取得）
- **実装状況**: フロントエンド・バックエンド完全実装済み・URL分離完了

## 2. 主な機能
- URL パラメータベースのガチャ詳細取得
- ガチャ名・説明・価格・提供割合の表示
- 商品リスト（画像・商品名・残り数/全体数）
- 「1回引く」「10連引く」ボタン
- ブラウザの戻る/進むボタン対応

## 4. 各要素の詳細
### 4.1 ガチャ基本情報（現行DBスキーマ対応）
- **ガチャ名**: gachas.name（VARCHAR(128), 必須）
- **説明**: gachas.description（TEXT, 任意）
- **価格**: gachas.price（INTEGER, 必須）
- **作成者**: users.name（作成者表示用）
- **公開状態**: gachas.is_public（BOOLEAN）
- **作成日時**: gachas.created_at

### 4.2 商品リスト情報（gacha_itemsテーブル）
- **商品画像**: gacha_items.image_url（VARCHAR(255), 任意、複数サイズ対応）
- **商品名**: gacha_items.name（VARCHAR(128), 必須）
- **説明**: gacha_items.description（TEXT, 任意）
- **初期在庫数**: gacha_items.stock（INTEGER, 在庫管理用）
**残り在庫数**: `gacha_items.stock` から、`gacha_results` テーブル内の該当アイテムの排出数を引いて動的に計算（この値はSSEでリアルタイム表示される）
- **公開状態**: gacha_items.is_public（BOOLEAN）

### 4.3 ガチャ実行ボタン
- **1回引くボタン**: 1回分のガチャ実行API呼び出し
- **10連引くボタン**: 10回分のガチャ実行API呼び出し（将来実装）

### 4.4 削除された機能（現行DBでは未対応）
- ~~**提供割合**~~: 確率カラムは削除済み（migration 003）
- ~~**レアリティ**~~: レアリティカラムは存在しない
- ~~**カテゴリ**~~: カテゴリカラムは存在しない

## 5. API設計（在庫数SSE対応）
### 5.1 実装済みエンドポイント
- ✅ **GET /api/gachas/:id** ... ガチャ詳細取得（アイテム情報含む）
- ✅ **POST /api/gachas/:id/draw** ... ガチャ実行（認証必須）
- 🔄 **GET /api/gachas/:id/stock/stream** ... 指定ガチャの在庫数をSSEで配信（クライアントは詳細画面表示時に購読）

### 5.2 レスポンス形式
#### ガチャ詳細取得（GET /api/gachas/:id）
```json
{
  "gacha": {
    "id": 1,
    "name": "レアアイテムガチャ",
    "description": "レアなアイテムが当たるガチャです",
    "price": 100,
    "is_public": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "user_id": 1,
    "creator_name": "作成者名",
    "items": [
      {
        "id": 1,
        "name": "ダイヤモンド",
        "description": "貴重なダイヤモンド",
        "image_url": "https://example.com/diamond.png",
        "image_sizes": {
          "original": {
            "avif": "http://localhost:9000/gacha-images/users/123/items/original/avif/1640995200000_diamond.avif",
            "webp": "http://localhost:9000/gacha-images/users/123/items/original/webp/1640995200000_diamond.webp",
            "jpeg": "http://localhost:9000/gacha-images/users/123/items/original/jpeg/1640995200000_diamond.jpg"
          },
          "desktop": {
            "avif": "http://localhost:9000/gacha-images/users/123/items/desktop/avif/1640995200000_diamond.avif",
            "webp": "http://localhost:9000/gacha-images/users/123/items/desktop/webp/1640995200000_diamond.webp",
            "jpeg": "http://localhost:9000/gacha-images/users/123/items/desktop/jpeg/1640995200000_diamond.jpg"
          },
          "mobile": {
            "avif": "http://localhost:9000/gacha-images/users/123/items/mobile/avif/1640995200000_diamond.avif",
            "webp": "http://localhost:9000/gacha-images/users/123/items/mobile/webp/1640995200000_diamond.webp",
            "jpeg": "http://localhost:9000/gacha-images/users/123/items/mobile/jpeg/1640995200000_diamond.jpg"
          },
          "thumbnail": {
            "avif": "http://localhost:9000/gacha-images/users/123/items/thumbnail/avif/1640995200000_diamond.avif",
            "webp": "http://localhost:9000/gacha-images/users/123/items/thumbnail/webp/1640995200000_diamond.webp",
            "jpeg": "http://localhost:9000/gacha-images/users/123/items/thumbnail/jpeg/1640995200000_diamond.jpg"
          }
        },
        "stock": 100
      },
      {
        "id": 2,
        "name": "ゴールド",
        "description": "金のインゴット",
        "image_url": "https://example.com/gold.png",
        "image_sizes": {
          "original": {
            "avif": "http://localhost:9000/gacha-images/users/123/items/original/avif/1640995300000_gold.avif",
            "webp": "http://localhost:9000/gacha-images/users/123/items/original/webp/1640995300000_gold.webp",
            "jpeg": "http://localhost:9000/gacha-images/users/123/items/original/jpeg/1640995300000_gold.jpg"
          },
          "desktop": {
            "avif": "http://localhost:9000/gacha-images/users/123/items/desktop/avif/1640995300000_gold.avif",
            "webp": "http://localhost:9000/gacha-images/users/123/items/desktop/webp/1640995300000_gold.webp",
            "jpeg": "http://localhost:9000/gacha-images/users/123/items/desktop/jpeg/1640995300000_gold.jpg"
          },
          "mobile": {
            "avif": "http://localhost:9000/gacha-images/users/123/items/mobile/avif/1640995300000_gold.avif",
            "webp": "http://localhost:9000/gacha-images/users/123/items/mobile/webp/1640995300000_gold.webp",
            "jpeg": "http://localhost:9000/gacha-images/users/123/items/mobile/jpeg/1640995300000_gold.jpg"
          },
          "thumbnail": {
            "avif": "http://localhost:9000/gacha-images/users/123/items/thumbnail/avif/1640995300000_gold.avif",
            "webp": "http://localhost:9000/gacha-images/users/123/items/thumbnail/webp/1640995300000_gold.webp",
            "jpeg": "http://localhost:9000/gacha-images/users/123/items/thumbnail/jpeg/1640995300000_gold.jpg"
          }
        },
        "stock": 200
      }
    ]
  }
}
```

#### ガチャ実行（POST /api/gachas/:id/draw）
```json
// リクエスト
{
  "count": 1  // 将来的に10連対応予定
}

// レスポンス
{
  "message": "Gacha draw successful",
  "item": {
    "id": 1,
    "name": "ダイヤモンド",
    "description": "貴重なダイヤモンド",
    "image_url": "https://example.com/diamond.png",
    "image_sizes": {
      "original": {
        "avif": "http://localhost:9000/gacha-images/users/123/items/original/avif/1640995200000_diamond.avif",
        "webp": "http://localhost:9000/gacha-images/users/123/items/original/webp/1640995200000_diamond.webp",
        "jpeg": "http://localhost:9000/gacha-images/users/123/items/original/jpeg/1640995200000_diamond.jpg"
      },
      "desktop": {
        "avif": "http://localhost:9000/gacha-images/users/123/items/desktop/avif/1640995200000_diamond.avif",
        "webp": "http://localhost:9000/gacha-images/users/123/items/desktop/webp/1640995200000_diamond.webp", 
        "jpeg": "http://localhost:9000/gacha-images/users/123/items/desktop/jpeg/1640995200000_diamond.jpg"
      },
      "mobile": {
        "avif": "http://localhost:9000/gacha-images/users/123/items/mobile/avif/1640995200000_diamond.avif",
        "webp": "http://localhost:9000/gacha-images/users/123/items/mobile/webp/1640995200000_diamond.webp",
        "jpeg": "http://localhost:9000/gacha-images/users/123/items/mobile/jpeg/1640995200000_diamond.jpg"
      },
      "thumbnail": {
        "avif": "http://localhost:9000/gacha-images/users/123/items/thumbnail/avif/1640995200000_diamond.avif",
        "webp": "http://localhost:9000/gacha-images/users/123/items/thumbnail/webp/1640995200000_diamond.webp",
        "jpeg": "http://localhost:9000/gacha-images/users/123/items/thumbnail/jpeg/1640995200000_diamond.jpg"
      }
    }
  },
  "result_id": 123
}
```

### 5.3 エラーレスポンス
- **400**: Invalid gacha ID, No items available, All items out of stock
- **401**: Unauthorized（ガチャ実行時）
- **404**: Gacha not found or not public
- **500**: Internal server error

## 6. バリデーション・UX ✅ 実装完了（バックエンド）
### 6.1 実装済みバリデーション
- ✅ **ガチャID検証**: 数値以外はエラー
- ✅ **ガチャ存在確認**: 存在しないガチャはエラー
- ✅ **公開状態確認**: 非公開ガチャは閲覧不可
- ✅ **在庫確認**: 在庫なしアイテムは抽選対象外
- ✅ **認証確認**: ガチャ実行には認証必須

### 6.2 フロントエンド実装完了のUX
- ✅ **商品画像**: サムネイル表示（fallback画像対応、レスポンシブ画像選択）
- ✅ **残り数が0の商品**: グレーアウト・SOLD OUT表示
- ✅ **10連ガチャボタン**: 在庫状況に応じた有効/無効制御
- ✅ **引くボタン**: ローディング・多重押下防止機能
- ✅ **ガチャ結果演出**: アニメーション付きUI（レスポンシブ画像表示）
- ✅ **レスポンシブ対応**: モバイル・デスクトップ両対応（最適画像自動選択）
- ✅ **エラーハンドリング**: スナックバーによる通知

## 7. 権限制御 ✅ 実装完了
- ✅ **ガチャ詳細閲覧**: 全ユーザーが公開ガチャを閲覧可能
- ✅ **ガチャ実行**: 認証済みユーザーのみ（JWT認証）
- ✅ **非公開ガチャ**: is_public=falseのガチャは表示されない
- ✅ **在庫管理**: 残り在庫数0のアイテムは抽選対象外。残り在庫数は `初期在庫数 - 排出済数` で動的に計算。

## 8. 技術仕様 ✅ 完全実装完了
### 8.1 実装済み技術スタック（一部SSE対応）
- ✅ **バックエンド**: Node.js + Fastify
- ✅ **データベース**: PostgreSQL（完全スキーマ対応）
- ✅ **認証**: JWT認証（ガチャ実行時）
- ✅ **バリデーション**: Joi + パラメータ検証
- ✅ **エラーハンドリング**: 統一されたエラーレスポンス
- ✅ **フロントエンド**: React + Material-UI
- ✅ **レスポンシブ対応**: スマホ・PC対応
- ✅ **アニメーション**: Framer Motion（ガチャ演出）
- ✅ **状態管理**: React Hooks（useState, useEffect）
- ✅ **API通信**: axios + エラーハンドリング（一部SSE: EventSourceで在庫数のみ購読）
- ✅ **レスポンシブ画像**: Picture要素 + srcset（AVIF/WebP/JPEG自動選択）

### 8.2 実装済み機能詳細
- ✅ **動的データ取得**: gachaIdベースのAPI呼び出し
- ✅ **ローディング状態**: スピナー表示
- ✅ **エラー状態**: エラーメッセージ・復帰ボタン
- ✅ **在庫制御**: リアルタイム在庫確認・ボタン制御
- ✅ **ガチャ実行**: API連携・結果取得・演出表示
- ✅ **自動更新**: ガチャ実行後の在庫情報更新

## 9. データベース実装状況
### 9.1 使用テーブル
- ✅ **gachas**: 基本情報（name, description, price, is_public等）
- ✅ **gacha_items**: アイテム情報（name, stock, image_url, is_public等）
- ✅ **gacha_results**: 実行履歴（user_id, gacha_id, item_id等）
- ✅ **users**: ユーザー情報（認証・作成者表示用）

### 9.2 削除済み機能
- ❌ **probability列**: migration 003で削除済み
- ❌ **category列**: 未実装（将来拡張予定）
- ❌ **rarity列**: 未実装（将来拡張予定）

## 10. 実装完了事項・開発メモ
### 10.1 完了済み機能
- ✅ **ガチャ詳細取得API** - アイテム情報含む完全なレスポンス
- ✅ **ガチャ実行API** - 認証付きランダム抽選機能
- ✅ **在庫管理** - ガチャ実行履歴の記録による動的な在庫計算
- ✅ **公開状態制御** - 非公開ガチャの適切な制限
- ✅ **エラーハンドリング** - 詳細なエラーメッセージ
- ✅ **セキュリティ** - JWT認証とパラメータ検証

### 10.2 実装待ち機能
- 🔄 **10連ガチャ機能拡張** - 現在は1回のみ対応、バックエンドで10連実装必要
- 🔄 **ガチャ結果演出改善** - より豪華なアニメーション
- 🔄 **お気に入り機能** - ガチャブックマーク
- 🔄 **レビュー・評価機能** - ユーザー評価システム
- 🔄 **Three.js/PixiJS演出** - より高度な3D/2D演出

### 10.3 フロントエンド実装完了状況
- ✅ **コンポーネント設計**: UserGachaDetail.jsの完全実装
- ✅ **API連携**: gachaAPI.getGacha(), gachaAPI.drawGacha()
- ✅ **ルーティング**: UserGachaListからの遷移対応
- ✅ **状態管理**: loading, error, gacha, snackbar状態
- ✅ **UI/UX**: Material-UI + Framer Motionによるモダンデザイン
- ✅ **レスポンシブ**: モバイルファースト対応
- ✅ **エラーハンドリング**: 包括的なエラー処理
- ✅ **画像最適化**: Sharp.js処理済み複数サイズ・フォーマット対応

### 10.3 API テスト状況
- ✅ **ガチャ詳細取得**: 動作確認済み
- ✅ **ガチャ実行**: 認証・`gacha_results`への結果記録は動作確認済み。在庫の動的計算ロジックへの変更が必要。
- ✅ **エラーハンドリング**: 各種エラーケース確認済み

### 10.4 技術的特徴
- **アイテム抽選ロジック**: 在庫が残っている（`gacha_items.stock > COUNT(gacha_results)`） アイテムからランダムに選択。
- **レスポンス統一**: ガチャ情報とアイテム一覧を一度に取得
- **データ整合性**: ガチャ実行時に `gacha_results` へレコードを追加。在庫数は `gacha_items.stock` をマスターデータとして動的に計算するため、整合性が常に保たれる。
