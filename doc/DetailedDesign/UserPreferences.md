# ユーザー設定画面設計書

## 1. 画面概要
- ユーザーの個人設定を管理する画面
- ガチャ表示順の設定、興味カテゴリの設定、テーマ設定などのパーソナライゼーション機能を提供
- ユーザーの好みに合わせたガチャ体験のカスタマイズ
- **URL**: `/profile/preferences`
- **遷移先**: ガチャ一覧画面（設定適用後）

## 2. 主な機能
- ガチャ表示順設定（新しい順、人気順、おすすめ順等）
- パーソナライゼーション機能のオン/オフ設定
- 興味カテゴリ別レベル設定（1-5レベルスライダー）
- デフォルト表示カテゴリの選択
- テーマ設定（ライト/ダーク/自動）
- 言語設定（現在は日本語のみ）
- 通知設定（新ガチャ通知、お気に入り更新通知）
- 設定の保存・リセット機能
- リアルタイムプレビュー機能

## 3. UI/UX特徴
- Material-UIコンポーネントによる統一されたデザイン
- スライダーによる直感的な興味レベル調整
- リアルタイムプレビュー機能（テーマ変更時）
- トグルスイッチによるシンプルなオン/オフ操作
- 変更検知と保存状態の明確なフィードバック
- レスポンシブデザイン対応
- アクセシビリティ配慮
- フォームバリデーションとエラー表示

## 4. 表示データ項目
- **表示順設定**: sort_preference（newest, popular, personalized, price_low, price_high）
- **パーソナライゼーション**: personalization_enabled
- **興味カテゴリ**: category_name, interest_level（1-5）
- **デフォルトカテゴリ**: default_categories（複数選択）
- **テーマ設定**: theme_preference（light, dark, auto）
- **言語設定**: language（ja）
- **通知設定**: notification_enabled
- **変更状態**: hasChanges, saving

## 5. API設計
- **GET /api/user/preferences** ... ユーザー設定取得
  - レスポンス: sort_preference, theme_preference, notification_enabled, personalization_enabled, interest_categories, default_categories
- **PUT /api/user/preferences** ... ユーザー設定更新
  - リクエスト: 変更項目のみ送信、差分更新対応
- **GET /api/gacha-categories** ... 利用可能カテゴリ一覧取得
  - レスポンス: category_id, category_name, description

## 6. バリデーション・UX
- クライアントサイド: Yupスキーマによる即時バリデーション
- サーバーサイド: Joiスキーマによる入力値検証
- 興味レベル: 1-5の範囲チェック
- パーソナライゼーション依存関係の検証
- 変更検知と保存ボタンの有効/無効切り替え
- スナックバーによる成功/エラー通知

## 7. 権限制御
- ログインユーザーのみアクセス可（fastify.authenticate）
- 自分の設定のみ編集可能
- JWTトークンによる認証管理
- セッションタイムアウト管理

## 8. 技術仕様
- フロントエンド: React 18 + Material-UI v5
- 状態管理: React Hooks（useState, useEffect, useCallback）
- API通信: Fetch API with utils/api.js
- バリデーション: Yup（フロント）/Joi（バックエンド）
- スライダーコンポーネント: Material-UI Slider
- テーマ管理: Material-UI ThemeProvider
- フォーム管理: 変更検知ロジック

## 9. エラーハンドリング
- APIエラー時のスナックバー通知
- バリデーションエラーの各項目への即時表示
- ネットワークエラー時の自動リトライ
- 設定保存失敗時のロールバック

## 10. パフォーマンス考慮
- React.memoによる不要な再レンダリング防止
- useCallback/useMemoによる処理最適化
- デバウンス処理による自動保存機能
- 差分更新による通信量削減
- ローカルストレージへの一時的な設定保存

## 11. 今後の拡張予定
- より細かい通知設定（カテゴリ別、時間帯指定）
- プロフィール連携機能（アバター、自己紹介）
- インポート/エクスポート機能
- A/Bテスト連携機能
- ソーシャルログイン連携設定