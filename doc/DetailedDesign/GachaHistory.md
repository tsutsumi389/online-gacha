# ガチャ履歴画面 詳細設計 ✅ 実装完了

## 1. 画面概要
- ログインユーザーのガチャ実行履歴を時系列で表示する画面
- ヘッダーのユーザーアイコンドロップダウンメニューから遷移
- **URL**: `/gacha-history`
- **認証**: 要ログイン（PrivateRoute）

## 2. 主な機能
- ガチャ実行履歴の一覧表示（時系列降順）
- ページネーション対応（20件/ページ）
- 各履歴の詳細情報表示
- 履歴が空の場合の適切なメッセージ表示
- エラーハンドリングと再試行機能

## 3. 表示項目
- **実行日時**: `executed_at`フィールドから日本時間で表示
- **ガチャ名**: 実行したガチャの名称
- **獲得アイテム名**: 抽選で獲得したアイテムの名称
- **アイテムサムネイル**: アイテムの画像（80x80px）
- **アイテム説明**: アイテムの詳細説明（オプション）

## 4. データ取得・API
### 4.1 バックエンドAPI
- **エンドポイント**: `GET /api/auth/gacha-history`
- **認証**: JWT トークン必須
- **パラメータ**: 
  - `page`: ページ番号（デフォルト: 1）
  - `limit`: 1ページあたりの件数（デフォルト: 20, 最大: 100）

### 4.2 SQLクエリ
```sql
SELECT 
  gr.id,
  gr.executed_at,
  g.name as gacha_name,
  gi.name as item_name,
  gi.description as item_description,
  COALESCE(
    (SELECT iiv.image_url 
     FROM item_image_variants iiv 
     JOIN item_images ii ON iiv.item_image_id = ii.id 
     WHERE ii.id = gi.item_image_id 
       AND iiv.size_type = 'thumbnail' 
       AND iiv.format_type = 'webp' 
     LIMIT 1),
    '/api/images/default-item.png'
  ) as item_image_url,
  g.id as gacha_id,
  gi.id as item_id
FROM gacha_results gr
JOIN gachas g ON gr.gacha_id = g.id
JOIN gacha_items gi ON gr.gacha_item_id = gi.id
WHERE gr.user_id = $1
ORDER BY gr.executed_at DESC
LIMIT $2 OFFSET $3
```

### 4.3 レスポンス形式
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
### 5.1 コンポーネント: `GachaHistory.js`
- **フレームワーク**: React with Material-UI
- **アニメーション**: Framer Motion
- **状態管理**: useState, useEffect
- **ルーティング**: React Router (useNavigate)

### 5.2 主要state
```javascript
const [history, setHistory] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [pagination, setPagination] = useState({});
```

### 5.3 UI/UXデザイン
- **レスポンシブデザイン**: Container maxWidth="lg"
- **カードレイアウト**: 各履歴項目をCardコンポーネントで表示
- **アニメーション**: motion.div によるフェードイン・スライドイン
- **ローディング**: CircularProgress による読み込み表示
- **エラー表示**: Alert コンポーネントによる適切なエラーメッセージ

## 6. ナビゲーション・遷移
### 6.1 ヘッダーメニューからの遷移
- **トリガー**: ユーザーアバターアイコンクリック → ドロップダウンメニュー → 「ガチャ履歴」クリック
- **アイコン**: HistoryIcon (Material-UI)
- **実装場所**: `App.js` の Menu コンポーネント内

### 6.2 戻るナビゲーション
- **戻るボタン**: ArrowBackIcon付きボタンでホーム画面へ遷移
- **パンくずナビ**: なし（シンプルな戻るボタンのみ）

## 7. エラーハンドリング・UX
### 7.1 ローディング状態
- **表示**: 中央配置のCircularProgress
- **最小表示時間**: 自然な読み込み体験のため

### 7.2 エラー状態
- **APIエラー**: 「ガチャ履歴の取得に失敗しました」メッセージ
- **再試行機能**: 「再試行」ボタンによるデータ再取得
- **ホーム遷移**: 「ホームに戻る」ボタン

### 7.3 空データ状態
- **アイコン**: 大きなHistoryIcon
- **メッセージ**: 「ガチャ履歴がありません」
- **案内文**: ガチャ一覧への誘導メッセージ
- **アクションボタン**: 「ガチャ一覧を見る」ボタン

## 8. 技術仕様
### 8.1 使用テーブル
- ✅ **gacha_results**: ガチャ実行履歴（user_id, gacha_id, gacha_item_id, executed_at）
- ✅ **gachas**: ガチャ基本情報（name, description）
- ✅ **gacha_items**: アイテム情報（name, description, item_image_id）
- ✅ **item_images**: アイテム画像情報（MinIO連携）
- ✅ **item_image_variants**: 画像バリアント（サムネイル、WebP対応）

### 8.2 パフォーマンス考慮
- **ページネーション**: 大量データ対応（20件/ページ）
- **画像最適化**: WebP形式サムネイル優先取得
- **フォールバック**: デフォルト画像による画像読み込みエラー対応
- **データベース**: 適切なJOINとINDEX活用

## 9. セキュリティ
- **認証必須**: JWTトークンによる認証確認
- **ユーザー制限**: 自分の履歴のみ表示（WHERE gr.user_id = $1）
- **入力検証**: ページ・リミットパラメータの適切な検証

## 10. 今後の拡張予定
- **検索機能**: ガチャ名・アイテム名による履歴検索
- **フィルタ機能**: 期間指定、ガチャ種別フィルタ
- **エクスポート機能**: CSV・PDF形式での履歴ダウンロード
- **統計表示**: 月別実行回数、人気ガチャランキング
- **詳細モーダル**: アイテム詳細情報のポップアップ表示

## 11. 実装完了事項
- ✅ **バックエンドAPI**: `/api/auth/gacha-history` エンドポイント実装
- ✅ **データベース**: `Gacha.getUserGachaHistory()` メソッド実装
- ✅ **フロントエンド**: `GachaHistory.js` コンポーネント実装
- ✅ **ルーティング**: `/gacha-history` ルート追加（PrivateRoute）
- ✅ **ナビゲーション**: ユーザーアイコンメニューに「ガチャ履歴」追加
- ✅ **API連携**: `authAPI.getGachaHistory()` 実装
- ✅ **UI/UX**: Material-UI + Framer Motion による洗練されたデザイン
- ✅ **エラーハンドリング**: 適切なローディング・エラー・空データ状態表示
- ✅ **レスポンシブ**: モバイル・タブレット・デスクトップ対応
- ✅ **ページネーション**: 効率的な大量データ表示対応