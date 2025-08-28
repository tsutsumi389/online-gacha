# マイガチャ状況確認画面 詳細設計

## 1. 概要
- 自分が出品したガチャの在庫・当選状況・統計をダッシュボード形式で確認できる画面
- URL: `/my-gacha/:id/status`
- 全ユーザーが自分のガチャのみアクセス可能

## 2. 主な機能・画面要素
- 統計サマリーカード（総アイテム数、残り在庫、在庫率、在庫切れ数など）
- アイテムごとの在庫状況（初期在庫・残り数・消費率をプログレスバーで可視化）
- 当選者リスト（排出日時・ユーザー名・メールアドレス・アバター表示、ページネーション対応）
- 手動リフレッシュボタン
- エラー・ローディング表示
- レスポンシブ対応（Material-UI + Framer Motion）

## 3. API設計
- **GET `/api/gachas/:id/status`**
  - 概要: ガチャの在庫・当選者状況を取得
  - クエリ: `page`, `limit`（デフォルト: 1, 10）
  - レスポンス例:
    ```json
    {
      "gacha": {
        "id": 1,
        "name": "レアアイテムガチャ",
        "items": [
          {
            "id": 10,
            "name": "SSRアイテム",
            "initial_stock": 5,
            "stock": 2
          }
        ]
      },
      "winners": [
        {
          "item_id": 10,
          "item_name": "SSRアイテム",
          "user_name": "山田太郎",
          "user_email": "taro@example.com",
          "drawn_at": "2025-08-01T12:34:56.000Z"
        }
      ],
      "pagination": {
        "currentPage": 1,
        "totalPages": 2,
        "totalItems": 12,
        "itemsPerPage": 10
      }
    }
    ```

## 4. バリデーション・UX
- JWT認証必須、本人のガチャのみアクセス可
- ページネーション対応（当選者リスト）
- エラー時は日本語メッセージ表示
- ローディング時はスピナー表示
- 統計値・在庫率は0除算対策あり

## 5. 技術仕様
- フロント: React 18, Material-UI v5, Framer Motion, React Router v6
- 状態管理: React Hooks
- API通信: `myGachaAPI.getGachaStatus(gachaId, page)`
- アバター: ユーザー名の頭文字 or 画像
- レスポンシブデザイン

## 6. 今後の拡張予定
- 詳細分析（時系列グラフ、人気アイテムランキング等）
- 通知機能（在庫切れアラート等）
- データエクスポート（CSV/PDF）
- 検索・フィルタ（当選者・アイテム名）
