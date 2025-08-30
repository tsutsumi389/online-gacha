# 管理者分析ダッシュボード設計書

## 1. 画面概要
- 管理者向けのガチャ分析機能を提供するダッシュボード画面
- ガチャの利用統計、ユーザー行動分析、デモグラフィック情報を可視化
- 運営上の意思決定をサポートする分析レポート機能
- **URL**: `/admin/analytics`
- **遷移先**: 個別ガチャ詳細分析画面（クリック時）

## 2. 主な機能
- 全体統計サマリー表示（総ガチャ数、総抽選回数、総ユーザー数、期間別収益）
- 人気ガチャランキング表示
- 時間別利用状況グラフ（24時間/7日間/30日間）
- 男女比・年齢別分布分析
- デモグラフィック別収益分析
- 期間選択フィルター（今日、今週、今月、カスタム期間）
- ガチャ別詳細統計テーブル
- リアルタイムデータ更新

## 3. UI/UX特徴
- Material-UI + Rechartsによるモダンなダッシュボードデザイン
- 期間選択による動的データ更新
- インタラクティブなグラフ表示（ズーム、ツールチップ、クリック詳細表示）
- CountUp.jsによる数値アニメーション
- レスポンシブデザイン対応
- ヒートマップ表示による視覚的データ分析
- ソート・フィルタリング機能付きテーブル
- エクスポート機能（CSV、PDF）

## 4. 表示データ項目
- **統計サマリー**: total_gachas, total_draws, total_users, revenue_today/week/month
- **人気ガチャ**: gacha_name, total_draws, ranking, revenue
- **時間別統計**: hour_bucket, draws_count, unique_users, revenue
- **デモグラフィック**: gender_breakdown, age_breakdown（利用者数・収益）
- **ガチャ詳細統計**: gacha_name, draws, users, avg_draws_per_user, revenue, popular_item
- **期間フィルター**: date_range（today, thisWeek, thisMonth, custom）

## 5. API設計
- **GET /api/admin/analytics/dashboard** ... 全体ダッシュボードデータ取得
  - クエリパラメータ: dateRange, startDate, endDate
  - レスポンス: 統計サマリー、人気ガチャ、時間別統計、デモグラフィック分析
- **GET /api/admin/gacha-analytics/:id** ... 個別ガチャ詳細分析
  - レスポンス: ガチャ別統計、時間別推移、デモグラフィック内訳
- **GET /api/admin/analytics/export** ... データエクスポート（CSV/PDF）

## 6. バリデーション・UX
- 期間選択時のデータ再取得とローディング表示
- チャート描画エラー時の代替表示
- データ不整合時の適切なメッセージ
- レスポンシブ対応（スマホ・タブレット・PC）
- 大量データ時の仮想スクロール対応

## 7. 権限制御
- 管理者権限必須（fastify.authenticate）
- JWTトークンによる認証
- セッションタイムアウト管理
- 統計データの適切な匿名化

## 8. 技術仕様
- フロントエンド: React 18 + Material-UI v5
- 状態管理: React Hooks
- Chart表示: Recharts（LineChart, BarChart, PieChart）
- API通信: Fetch API with utils/api.js
- 数値アニメーション: CountUp.js
- データ処理: 統計計算とデモグラフィック分析
- エクスポート: CSV/PDF生成

## 9. エラーハンドリング
- APIエラー時の適切なメッセージ表示
- ネットワークエラー時の自動リトライ
- チャート描画失敗時の代替表示
- データ欠損時のフォールバック

## 10. パフォーマンス考慮
- React.memoによる不要な再レンダリング防止
- useMemoによる重い計算処理のキャッシュ
- デバウンス処理による無駄なAPI呼び出し削減
- 仮想スクロールによる大量データ対応
- Chart更新時のアニメーション最適化

## 11. 今後の拡張予定
- リアルタイムデータ更新（WebSocket）
- A/Bテスト結果の統合表示
- より詳細なユーザー行動分析
- 予測分析機能
- カスタムレポート作成機能
- アラート・通知機能