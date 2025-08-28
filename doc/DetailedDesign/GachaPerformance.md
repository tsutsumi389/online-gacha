
# ガチャ演出画面 詳細設計

## 1. 画面概要
- ガチャ実行時に表示されるアニメーション・演出画面
- 現状は1回用のみ実装（10連・確定・逆転演出は未実装）
- **演出終了後に当選アイテムを表示**
- **実装状況**: フロントエンド基本機能実装済み

## 2. 実装済み・予定演出パターン
- ✅ 通常演出（Framer Motionベース、光・パーティクル等）
- 🔄 確定演出（高レアリティ時、将来実装）
- 🔄 逆転演出（途中昇格、将来実装）
- 🔄 10連演出（複数同時、将来実装）

## 3. 技術仕様・UI/UX
- React + Material-UI + Framer Motionで演出実装
- APIレスポンスのアイテム情報を動的に表示
- result Propsで親から結果受け渡し
- パーティクル・光・星アニメ等の演出
- レスポンシブ対応（画像最適化・Picture要素）
- スキップ/戻るボタン（演出終了後のみ有効）

## 4. 主要要素
- アニメーション: Framer Motionベース、星・光・パーティクル
- 結果表示: 当選アイテム画像・名称・説明（演出終了後のみ）
- ボタン: 戻る（onBack）、もう一度引く（未実装）

## 5. 演出分岐ロジック
- 現状はtype='normal'のみ。今後は抽選結果に応じてtypeを切替予定
  - 高レアリティ当選時: type='sure'（未実装）
  - 逆転パターン: type='reverse'（未実装）
  - 10連: type='multi'（未実装）


## 6. API設計
- **POST /api/gachas/:id/draw** ... ガチャ実行（1回のみ対応）
  - レスポンス例:
    ```json
    {
      "message": "Gacha draw successful",
      "item": {
        "id": 2,
        "name": "ノーマルアイテムB",
        "description": "普通のアイテム",
        "image_url": "/images/item2.png",
        "image_sizes": { ... },
        "stock": 50
      },
      "result": { ... },
      "gacha": { ... }
    }
    ```


## 7. バリデーション・UX
- 戻るボタン（演出終了後のみ有効）
- 結果表示: アニメーション終了後に有効化
- API結果に基づくアイテム情報表示（レスポンシブ画像）
- fallback: デフォルト画像・情報表示
- 🔄 10連演出・BGM/SEは未実装


## 8. 実装状況・今後の拡張
### 8.1 実装済み
- GachaPerformance.js: 通常演出・API連携・レスポンシブ画像・エラー処理
- Props: type, result, onBack
- Framer Motionアニメーション
- fallback画像・情報
### 8.2 今後の拡張予定
- Three.js/PixiJS等による3D/2D演出
- 10連・複数アイテム演出
- 確定/逆転演出
- BGM・SE
- パフォーマンス最適化


## 9. 画像最適化
- Sharp.jsで4サイズ×3フォーマット自動生成
- original/desktop/mobile/thumbnail
- AVIF→WebP→JPEGの優先順位
- Picture要素でレスポンシブ表示

