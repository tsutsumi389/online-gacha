# ガチャ演出画面 詳細設計 ✅ 実装完了

## 1. 画面概要
- ガチャを引いた際に表示されるアニメーション・演出画面
- 1回用・10連用の2パターン（現在は1回のみ実装）
- 一般演出の実装完了
- **演出終了後に当選商品を表示する**
- **実装状況**: フロントエンド基本機能完全実装済み

## 2. 実装済み演出パターン
- ✅ **一般演出**: 通常のアニメーション（Framer Motionベース、光エフェクト等）
- 🔄 **確定演出**: 高レアリティ確定時の特別な演出（将来実装）
- 🔄 **逆転演出**: 一度ハズレ演出を見せた後、途中で高レアリティに昇格する演出（将来実装）

## 3. 実装済み技術仕様
- ✅ **React + Framer Motion**: UIアニメーション実装
- ✅ **Material-UI**: UI基盤
- ✅ **実際のAPIレスポンス対応**: ガチャ結果の動的表示（レスポンシブ画像対応）
- ✅ **result Props**: 親コンポーネントからの結果受け渡し
- ✅ **パーティクルエフェクト**: 基本的な演出効果
- ✅ **レスポンシブ対応**: モバイル・デスクトップ両対応（最適画像自動選択）

## 3. 画面レイアウト（ワイヤーフレーム例）

### 1回用
```
+-----------------------------+
|         [演出アニメ]        |
|   カプセル・光・エフェクト   |
|-----------------------------|
|         [結果表示]          |
|   当選商品画像・名称        |
|   ※演出終了後に表示        |
|-----------------------------|
| [もう一度引く] [戻る]       |
+-----------------------------+
```

### 10連用
```
+-----------------------------+
|         [演出アニメ]        |
| 10個のカプセルが並ぶ        |
|-----------------------------|
|      [結果リスト表示]       |
|  各当選商品画像・名称       |
|   ※演出終了後に表示        |
|-----------------------------|
| [もう一度10連] [戻る]       |
+-----------------------------+
```

## 4. 各要素の詳細
- **演出アニメ**: React + Three.js/PixiJS/Framer Motionで実装。演出種別に応じてアニメーション切替。
- **結果表示**: 当選商品画像・名称を大きく表示（10連はリスト形式）。**演出終了後にのみ表示**。
- **ボタン**: もう一度引く／戻る

## 5. 演出分岐ロジック
- 抽選結果に応じて演出種別を決定
  - 高レアリティ当選時 → 確定演出
  - 通常当選時 → 一般演出
  - 逆転パターン（抽選後に昇格） → 逆転演出
- 10連の場合は各カプセルごとに演出を分岐、または全体で一括演出

## 6. API設計 ✅ 実装完了
- ✅ **POST /api/gachas/:id/draw** ... ガチャ実行（1回対応）
  - レスポンスで獲得アイテム詳細情報を返却
  - 実際のAPIレスポンス形式：
    ```json
    {
      "message": "Gacha draw successful",
      "item": {
        "id": 2,
        "name": "ノーマルアイテムB",
        "description": "普通のアイテム",
        "image_url": "/images/item2.png",
        "image_sizes": {
          "original": {
            "avif": "http://localhost:9000/gacha-images/users/123/items/original/avif/1640995200000_item2.avif",
            "webp": "http://localhost:9000/gacha-images/users/123/items/original/webp/1640995200000_item2.webp",
            "jpeg": "http://localhost:9000/gacha-images/users/123/items/original/jpeg/1640995200000_item2.jpg"
          },
          "desktop": {
            "avif": "http://localhost:9000/gacha-images/users/123/items/desktop/avif/1640995200000_item2.avif",
            "webp": "http://localhost:9000/gacha-images/users/123/items/desktop/webp/1640995200000_item2.webp",
            "jpeg": "http://localhost:9000/gacha-images/users/123/items/desktop/jpeg/1640995200000_item2.jpg"
          },
          "mobile": {
            "avif": "http://localhost:9000/gacha-images/users/123/items/mobile/avif/1640995200000_item2.avif",
            "webp": "http://localhost:9000/gacha-images/users/123/items/mobile/webp/1640995200000_item2.webp",
            "jpeg": "http://localhost:9000/gacha-images/users/123/items/mobile/jpeg/1640995200000_item2.jpg"
          },
          "thumbnail": {
            "avif": "http://localhost:9000/gacha-images/users/123/items/thumbnail/avif/1640995200000_item2.avif",
            "webp": "http://localhost:9000/gacha-images/users/123/items/thumbnail/webp/1640995200000_item2.webp",
            "jpeg": "http://localhost:9000/gacha-images/users/123/items/thumbnail/jpeg/1640995200000_item2.jpg"
          }
        },
        "stock": 50
      },
      "result": { ... },
      "gacha": { ... }
    }
    ```

## 7. バリデーション・UX ✅ 実装完了
- ✅ **スキップボタン**: 演出を省略可能（戻るボタン実装）
- ✅ **結果表示**: アニメーション終了後にボタン有効化
- ✅ **実際のアイテム情報表示**: API結果に基づく獲得アイテム表示（レスポンシブ画像）
- ✅ **fallback対応**: アイテム画像・情報のデフォルト表示
- 🔄 **10連演出**: 将来実装予定
- 🔄 **BGM・SE**: 演出種別ごとの音響効果（将来実装）

## 8. 実装完了状況
### 8.1 完了機能
- ✅ **GachaPerformance.jsコンポーネント**: 基本演出実装
- ✅ **Props連携**: type, result, onBackの受け渡し
- ✅ **アニメーション**: Framer Motionベースの演出
- ✅ **結果表示**: 実際のAPIレスポンスデータ表示（レスポンシブ画像対応）
- ✅ **UIデザイン**: Material-UIベースのモダンデザイン
- ✅ **エラー処理**: データ不足時のfallback表示
- ✅ **画像最適化**: Sharp.js処理済み画像の演出表示

### 8.2 将来実装予定
- 🔄 **Three.js/PixiJS演出**: より高度な3D/2D演出
- 🔄 **10連対応**: 複数アイテム表示演出
- 🔄 **演出バリエーション**: 確定演出・逆転演出
- 🔄 **音響効果**: BGM・SEの追加
- 🔄 **パフォーマンス最適化**: アニメーション性能向上

## 9. 画像表示最適化 ✅ 設計更新

### 9.1 Sharp.js画像処理統合
- **アップロード時処理**: オリジナル画像 → 4サイズ×3フォーマット自動生成
- **サイズバリエーション**:
  - original: 最大2048x2048px（詳細表示用）
  - desktop: 1024x1024px（PC・タブレット用）
  - mobile: 512x512px（スマートフォン用）
  - thumbnail: 150x150px（一覧表示用）

### 9.2 フォーマット対応
- **AVIF**: 次世代画像フォーマット（50%以上のサイズ削減）
- **WebP**: モダンブラウザ対応（30%サイズ削減）
- **JPEG**: レガシーブラウザfallback

### 9.3 レスポンシブ画像表示
- **演出画面での適用**: デバイスサイズに応じた最適画像表示
- **ブラウザサポート判定**: AVIF → WebP → JPEG の優先順位
- **Picture要素活用**: 
  ```html
  <picture>
    <source srcSet="item_desktop.avif" media="(min-width: 768px)" type="image/avif" />
    <source srcSet="item_desktop.webp" media="(min-width: 768px)" type="image/webp" />
    <source srcSet="item_mobile.avif" media="(max-width: 767px)" type="image/avif" />
    <source srcSet="item_mobile.webp" media="(max-width: 767px)" type="image/webp" />
    <img src="item_desktop.jpg" alt="獲得アイテム" />
  </picture>
  ```

---
