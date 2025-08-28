# ユーザー用 ガチャ詳細画面 詳細設計

## 1. 画面概要
- 選択したガチャの詳細情報・商品リスト・在庫・画像を表示
- 「1回引く」ボタン（10連は将来実装）
- **URL**: `/gacha/:id`（URLパラメータでID取得）

## 2. 主な機能
- URLパラメータでガチャ詳細取得
- ガチャ名・説明・価格・作成者表示
- 商品リスト（画像・商品名・残り数/全体数）
- 「1回引く」ボタン（10連は将来実装）
- 在庫数のSSEリアルタイム表示
- 戻る/進むボタン対応

## 3. 表示項目
- ガチャ名・説明・価格・作成者・公開状態
- 商品画像（複数サイズ/フォーマット対応）
- 商品名・説明・初期在庫・残り在庫（SSEで動的更新）
- SOLD OUT表示（在庫0時）
- 「1回引く」ボタン（在庫・認証で制御）


## 4. API設計・レスポンス
### 4.1 エンドポイント
- **GET /api/gachas/:id** ... ガチャ詳細取得（アイテム情報含む）
- **POST /api/gachas/:id/draw** ... ガチャ実行（認証必須、1回のみ）
- **GET /api/gachas/:id/stock/stream** ... 指定ガチャの在庫数をSSEで配信

### 4.2 レスポンス例
#### ガチャ詳細取得
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
        "image_sizes": { ... },
        "stock": 100
      }
    ]
  }
}
```
#### ガチャ実行
```json
{
  "message": "Gacha draw successful",
  "item": { ... },
  "result_id": 123
}
```
#### エラー例
- 400: Invalid gacha ID, No items available, All items out of stock
- 401: Unauthorized
- 404: Gacha not found or not public
- 500: Internal server error


## 5. バリデーション・UX
- ガチャID・存在・公開状態・在庫・認証を全て検証
- 商品画像: サムネイル/レスポンシブ/フォールバック対応
- 残り数0: グレーアウト・SOLD OUT
- ボタン: 在庫・認証・ローディング・多重押下防止
- ガチャ演出: アニメーション付きUI
- エラー: スナックバー通知


## 6. 権限制御
- 公開ガチャは全ユーザー閲覧可
- ガチャ実行は認証必須
- 非公開ガチャは表示不可
- 在庫0は抽選対象外、残り在庫は動的計算


## 7. 技術仕様
- バックエンド: Node.js + Fastify
- DB: PostgreSQL
- 認証: JWT（ガチャ実行時）
- バリデーション: Joi
- エラーハンドリング: 統一レスポンス
- フロント: React + Material-UI
- アニメーション: Framer Motion
- 状態管理: React Hooks
- API通信: fetch + SSE（在庫のみEventSource）
- 画像: Picture要素 + srcset（AVIF/WebP/JPEG）


## 8. データベース
- gachas: 基本情報
- gacha_items: アイテム情報
- gacha_results: 実行履歴
- users: ユーザー情報
- （probability/category/rarity列は未実装・削除済み）


## 9. 実装状況・今後の拡張
### 9.1 完了済み
- ガチャ詳細取得API・ガチャ実行API・在庫管理・公開制御・エラーハンドリング・セキュリティ
- フロント: UserGachaDetail.js, API連携, 状態管理, UI/UX, 画像最適化
### 9.2 今後の拡張
- 10連ガチャ
- ガチャ演出強化
- お気に入り・レビュー機能
- Three.js/PixiJS演出
