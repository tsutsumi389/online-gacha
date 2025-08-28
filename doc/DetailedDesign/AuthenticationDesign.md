# ログイン・認証機能 詳細設計書

## 1. 概要

オンラインガチャシステムにおけるユーザー認証機能の詳細設計書です。JWT（JSON Web Token）を使用したステートレス認証を採用し、安全性と利便性を両立します。

## 2. 認証方式

### 2.1 採用技術
- **JWT（JSON Web Token）**: ステートレス認証
- **bcrypt**: パスワードハッシュ化
- **HttpOnly Cookie**: JWTトークンの安全な保存

### 2.2 認証フロー
1. ユーザーがメールアドレス・パスワードでログイン
2. サーバーが認証情報を検証
3. 認証成功時、JWTトークンを生成
4. トークンをHttpOnly Cookieでクライアントに送信
5. 以降のリクエストでトークンを自動送信・検証

## 3. 画面設計

### 3.1 ログイン画面

#### バリデーション
- **Email**: 
  - 必須入力
  - Email形式チェック
- **Password**: 
  - 必須入力
  - 最小8文字

#### エラー表示
- 入力エラー: フィールド下に赤文字で表示
- 認証エラー: フォーム上部に「メールアドレスまたはパスワードが正しくありません」

### 3.2 新規登録画面

#### バリデーション
- **ユーザー名**: 
  - 必須入力
  - 2-64文字
  - 英数字・ひらがな・カタカナ・漢字
- **Email**: 
  - 必須入力
  - Email形式チェック
  - 重複チェック
- **Password**: 
  - 必須入力
  - 最小8文字
  - 英数字含む
- **Password確認**: 
  - 必須入力
  - Passwordと一致
- **利用規約**: 
  - チェック必須

## 4. 推奨ライブラリ

### 4.1 フロントエンド（React）

#### 認証・フォーム関連
```json
{
  "react-hook-form": "^7.48.2",
  "yup": "^1.4.0",
  "@hookform/resolvers": "^3.3.2",
  "react-router-dom": "^6.20.1",
  "js-cookie": "^3.0.5"
}
```

#### UI/UXライブラリ
```json
{
  "@mui/material": "^5.15.0",
  "@mui/icons-material": "^5.15.0",
  "@emotion/react": "^11.11.1",
  "@emotion/styled": "^11.11.0",
  "framer-motion": "^10.16.16"
}
```

**推奨理由:**
- **react-hook-form**: 高性能なフォーム管理、簡潔な記述
- **yup**: 直感的なバリデーションスキーマ
- **Material-UI**: 美しく一貫性のあるUI、アクセシビリティ対応
- **framer-motion**: 滑らかなアニメーション効果

#### 代替案：軽量構成
```json
{
  "formik": "^2.4.5",
  "styled-components": "^6.1.1",
  "react-toastify": "^9.1.3"
}
```

### 4.2 バックエンド（Node.js/Fastify）

```json
{
  "fastify": "^4.27.2",
  "@fastify/jwt": "^7.2.4",
  "@fastify/cookie": "^9.2.0",
  "@fastify/cors": "^8.4.2",
  "bcrypt": "^5.1.1",
  "joi": "^17.11.0",
  "pg": "^8.11.3"
}
```

**推奨理由:**
- **@fastify/jwt**: Fastify専用JWT実装、高性能
- **@fastify/cookie**: 安全なCookie管理
- **bcrypt**: 業界標準のパスワードハッシュ化
- **joi**: 強力なデータバリデーション

## 5. セキュリティ考慮事項

### 5.1 パスワード
- bcryptでハッシュ化（saltRounds: 12）
- 最小8文字、英数字混合を推奨

### 5.2 JWT
- HttpOnly Cookieで保存（XSS対策）
- SameSite=Strict設定（CSRF対策）
- 適切な有効期限設定（24時間推奨）

### 5.3 CORS
- 本番環境では特定ドメインのみ許可
- 開発環境ではlocalhost許可

### 5.4 レート制限
- ログイン試行回数制限（5回/15分）
- 新規登録回数制限（3回/時間）

## 6. API設計

### 6.1 認証エンドポイント

```javascript
// POST /api/auth/register
{
  "name": "田中太郎",
  "email": "tanaka@example.com",
  "password": "password123"
}

// POST /api/auth/login
{
  "email": "tanaka@example.com",
  "password": "password123"
}

// POST /api/auth/logout
// (認証必須)

// GET /api/auth/me
// (認証必須) - 現在のユーザー情報取得
```

### 6.2 レスポンス形式

```javascript
// 成功時
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "田中太郎",
      "email": "tanaka@example.com",
      "role": "user"
    }
  }
}

// エラー時
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "メールアドレスまたはパスワードが正しくありません"
  }
}
```

## 7. 実装優先度

### Phase 1 (必須)
- [x] ログイン画面
- [x] 新規登録画面
- [x] JWT認証
- [x] パスワードハッシュ化

### Phase 2 (推奨)
- [ ] パスワードリセット機能
- [ ] プロフィール編集
- [ ] レート制限

### Phase 3 (拡張)
- [ ] ソーシャルログイン
- [ ] 二段階認証
- [ ] メール確認機能
