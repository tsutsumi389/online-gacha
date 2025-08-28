
# ガチャ履歴画面 詳細設計

## 1. 画面概要
- ログインユーザー自身のガチャ実行履歴を時系列降順で表示
- ユーザーメニューから遷移
- **URL**: `/gacha-history`
- **認証**: ログイン必須（PrivateRoute）

## 2. 主な機能
- ガチャ実行履歴の一覧表示（新しい順）
- ページネーション（20件/ページ、ページ切替時に自動スクロール）
- 各履歴の詳細（ガチャ名・アイテム名・画像・説明・日時）
- 履歴が空の場合の案内表示
- APIエラー時の再試行・ホーム遷移

## 3. 表示項目
- 実行日時（日本時間、`executed_at`）
- ガチャ名（`gacha_name`）
- 獲得アイテム名（`item_name`）
- アイテム画像（80x80px, `item_image_url`）
- アイテム説明（`item_description`、省略可）


## 4. データ取得・API
### 4.1 バックエンドAPI
- **エンドポイント**: `GET /api/auth/gacha-history`
- **認証**: JWT（HttpOnly Cookie）必須
- **パラメータ**:
  - `page`: ページ番号（デフォルト: 1）
  - `limit`: 1ページあたりの件数（デフォルト: 20, 最大: 100）

### 4.2 レスポンス例
```json
{
  "success": true,
  "history": [
    {
      "id": 123,
      "executed_at": "2024-08-26T12:00:00.000Z",
      "gacha_name": "レアアイテムガチャ",
      "item_name": "ドラゴンソード",
      "item_description": "炎の力を宿した伝説の剣",
      "item_image_url": "/api/images/items/dragon-sword-thumb.webp",
      "gacha_id": 45,
      "item_id": 234
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "itemsPerPage": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```


## 5. フロントエンド実装
### 5.1 主な構成
- **コンポーネント**: `GachaHistory.js`（React, Material-UI, Framer Motion）
- **状態管理**: useState, useEffect
- **API呼び出し**: `authAPI.getGachaHistory()`
- **ページネーション**: Paginationコンポーネント
- **UI/UX**:
  - ローディング: CircularProgress
  - エラー: Alert + 再試行/ホームボタン
  - 空データ: HistoryIcon + メッセージ + ガチャ一覧誘導
  - 各履歴: Cardレイアウト、画像・テキスト・日付表示
  - レスポンシブ対応


## 6. ナビゲーション
- ユーザーメニュー（アバター）→「ガチャ履歴」
- 戻るボタン（ArrowBackIcon）でホームへ


## 7. エラーハンドリング・UX
- ローディング: CircularProgress（中央配置）
- エラー: Alert + 再試行/ホームボタン
- 空データ: HistoryIcon + メッセージ + ガチャ一覧誘導


## 8. 技術仕様
- 使用テーブル: gacha_results, gachas, gacha_items, item_images, item_image_variants
- ページネーション: 20件/ページ、効率的なOFFSET
- 画像: WebPサムネイル優先、なければデフォルト画像
- DB: JOIN・INDEX最適化


## 9. セキュリティ
- JWT（HttpOnly Cookie）認証必須
- 自分の履歴のみ取得可能（user_idで制限）
- ページ・リミットの入力検証


## 10. 今後の拡張予定
- 検索（ガチャ名・アイテム名）
- フィルタ（期間・種別）
- エクスポート（CSV/PDF）
- 統計（月別回数・人気ランキング）
- 詳細モーダル（アイテム詳細）


## 11. 実装完了事項
- バックエンドAPI `/api/auth/gacha-history` 実装
- DBメソッド `Gacha.getUserGachaHistory()` 実装
- フロントエンド `GachaHistory.js` 実装
- ルーティング `/gacha-history` 追加（PrivateRoute）
- ナビゲーションに「ガチャ履歴」追加
- API連携・UI/UX・エラーハンドリング・レスポンシブ・ページネーション対応