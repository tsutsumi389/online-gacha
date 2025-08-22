# ユーザープロフィール管理画面 詳細設計書

## 1. 概要

ユーザーが自分のプロフィール情報（ユーザー名、メールアドレス、パスワード）を管理できる画面です。ログインしたユーザーのみアクセス可能で、安全性を考慮したバリデーション機能を提供します。

## 2. 画面仕様

### 2.1 画面基本情報

| 項目         | 内容                                    |
|--------------|----------------------------------------|
| **画面名**   | ユーザープロフィール管理画面            |
| **URL**      | `/profile`                             |
| **認証要否** | 必要（ログインユーザーのみアクセス可能） |
| **対象ユーザー** | 登録済みの全ユーザー                |

### 2.2 画面レイアウト

```
┌─────────────────────────────────────────────┐
│ AppBar (共通ヘッダー)                        │
├─────────────────────────────────────────────┤
│ プロフィール管理                              │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 現在の登録情報                           │ │
│ │ ・ユーザーID: 123                        │ │
│ │ ・登録日時: 2025-01-01                   │ │
│ │ ・最終更新日時: 2025-01-15               │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ プロフィール変更フォーム                  │ │
│ │                                         │ │
│ │ ユーザー名 (現在: current_name)          │ │
│ │ [新しいユーザー名] (変更時のみ入力)       │ │
│ │                                         │ │
│ │ メールアドレス (現在: current@email.com)  │ │
│ │ [新しいメールアドレス] (変更時のみ入力)   │ │
│ │                                         │ │
│ │ パスワード変更                           │ │
│ │ [現在のパスワード] (変更時のみ入力)       │ │
│ │ [新しいパスワード] (変更時のみ入力)       │ │
│ │ [新しいパスワード確認] (変更時のみ入力)   │ │
│ │                                         │ │
│ │           [保存]ボタン                   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 危険な操作セクション                      │ │
│ │ [アカウント削除ボタン] (将来実装)          │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 2.3 機能詳細

#### 2.3.1 現在の登録情報表示

- **表示項目**:
  - ユーザーID（読み取り専用）
  - 登録日時
  - 最終更新日時

#### 2.3.2 統合プロフィール変更フォーム

**フォーム仕様**:
- 変更したい項目のみ入力する方式
- 空欄の項目は変更されない
- 保存ボタンは一つのみ

**入力項目**:

1. **ユーザー名変更**（オプション）
   - 新しいユーザー名入力フィールド
   - プレースホルダー: "変更する場合のみ入力してください"
   - バリデーション: 入力時のみ実行（2-64文字、重複チェック）

2. **メールアドレス変更**（オプション）
   - 新しいメールアドレス入力フィールド
   - プレースホルダー: "変更する場合のみ入力してください"
   - バリデーション: 入力時のみ実行（メール形式、重複チェック）

3. **パスワード変更**（オプション）
   - 現在のパスワード入力フィールド
   - 新しいパスワード入力フィールド
   - 新しいパスワード確認入力フィールド
   - バリデーション: 現在のパスワードが入力された場合のみ実行
   - 注意: パスワード変更時は3つ全てのフィールドが必須

**バリデーション仕様**:
- 何も変更されていない場合はフォーム送信無効
- パスワード変更時は現在のパスワード、新しいパスワード、確認パスワード全て必須
- ユーザー名・メールアドレスは個別に変更可能
- リアルタイムバリデーションで即座にエラー表示

**操作**:
- 保存ボタン押下で変更された項目のみサーバーに送信
- 成功時はスナックバーで通知、失敗時はエラーメッセージ表示
- パスワード変更成功時は再ログインを推奨

## 3. API設計

### 3.1 ユーザー情報取得（既存）

```http
GET /api/auth/me
```

**Response**:
```json
{
  "user": {
    "id": 1,
    "name": "ユーザー名",
    "email": "user@example.com",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

### 3.2 プロフィール統合更新（新規）

```http
PUT /api/auth/profile
```

**Request**:
```json
{
  "name": "新しいユーザー名",           // オプション
  "email": "newemail@example.com",    // オプション
  "currentPassword": "現在のパスワード", // パスワード変更時のみ必須
  "newPassword": "新しいパスワード"      // パスワード変更時のみ必須
}
```

**リクエスト例**:

*ユーザー名のみ変更:*
```json
{
  "name": "新しいユーザー名"
}
```

*メールアドレスのみ変更:*
```json
{
  "email": "newemail@example.com"
}
```

*パスワードのみ変更:*
```json
{
  "currentPassword": "current123",
  "newPassword": "newPassword123"
}
```

*複数項目を同時変更:*
```json
{
  "name": "新しいユーザー名",
  "email": "newemail@example.com"
}
```

**Response**:
```json
{
  "message": "プロフィールが正常に更新されました",
  "user": {
    "id": 1,
    "name": "新しいユーザー名",
    "email": "newemail@example.com",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T11:00:00Z"
  },
  "changedFields": ["name", "email"] // 実際に変更されたフィールド一覧
}
```

**Error Response**:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "入力内容にエラーがあります",
  "details": {
    "name": "このユーザー名は既に使用されています",
    "email": "正しいメールアドレスを入力してください",
    "currentPassword": "現在のパスワードが正しくありません"
  }
}
```

## 4. フロントエンド実装

### 4.1 コンポーネント構成

```
UserProfile.js
├── UserInfoDisplay.js          // ユーザー情報表示
├── ProfileUpdateForm.js        // 統合プロフィール変更フォーム
│   ├── NameUpdateField.js      // ユーザー名変更フィールド
│   ├── EmailUpdateField.js     // メールアドレス変更フィールド
│   └── PasswordUpdateFields.js // パスワード変更フィールド
└── DangerZoneSection.js        // 危険な操作（将来実装）
```

### 4.2 状態管理

```javascript
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [formData, setFormData] = useState({
  name: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});
const [errors, setErrors] = useState({});
const [hasChanges, setHasChanges] = useState(false);
const [snackbar, setSnackbar] = useState({
  open: false,
  message: '',
  severity: 'info'
});
```

### 4.3 バリデーション

```javascript
// Yupを使用したバリデーションスキーマ
const profileValidationSchema = yup.object({
  name: yup
    .string()
    .when('name', {
      is: (val) => val && val.length > 0,
      then: yup.string()
        .min(2, 'ユーザー名は2文字以上で入力してください')
        .max(64, 'ユーザー名は64文字以下で入力してください'),
      otherwise: yup.string().notRequired()
    }),
  email: yup
    .string()
    .when('email', {
      is: (val) => val && val.length > 0,
      then: yup.string()
        .email('正しいメールアドレスを入力してください'),
      otherwise: yup.string().notRequired()
    }),
  currentPassword: yup
    .string()
    .when(['newPassword'], {
      is: (newPassword) => newPassword && newPassword.length > 0,
      then: yup.string().required('パスワード変更時は現在のパスワードが必要です'),
      otherwise: yup.string().notRequired()
    }),
  newPassword: yup
    .string()
    .when('newPassword', {
      is: (val) => val && val.length > 0,
      then: yup.string()
        .min(8, 'パスワードは8文字以上で入力してください')
        .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/, 'パスワードは英数字を含む必要があります'),
      otherwise: yup.string().notRequired()
    }),
  confirmPassword: yup
    .string()
    .when(['newPassword'], {
      is: (newPassword) => newPassword && newPassword.length > 0,
      then: yup.string()
        .oneOf([yup.ref('newPassword')], 'パスワードが一致しません')
        .required('パスワード確認は必須です'),
      otherwise: yup.string().notRequired()
    })
});

// 変更検知ロジック
const detectChanges = useCallback(() => {
  const hasNameChange = formData.name.trim() !== '';
  const hasEmailChange = formData.email.trim() !== '';
  const hasPasswordChange = formData.newPassword.trim() !== '';
  
  setHasChanges(hasNameChange || hasEmailChange || hasPasswordChange);
}, [formData]);
```

### 4.4 フォーム送信処理

```javascript
const handleSubmit = async (formValues) => {
  setSaving(true);
  setErrors({});

  try {
    // 変更されたフィールドのみを送信データに含める
    const updateData = {};
    
    if (formValues.name?.trim()) {
      updateData.name = formValues.name.trim();
    }
    
    if (formValues.email?.trim()) {
      updateData.email = formValues.email.trim();
    }
    
    if (formValues.newPassword?.trim()) {
      updateData.currentPassword = formValues.currentPassword;
      updateData.newPassword = formValues.newPassword;
    }

    // 何も変更されていない場合は送信しない
    if (Object.keys(updateData).length === 0) {
      setSnackbar({
        open: true,
        message: '変更する項目を入力してください',
        severity: 'warning'
      });
      return;
    }

    const response = await profileAPI.updateProfile(updateData);
    
    // ユーザー情報を更新
    setUser(response.user);
    
    // フォームをリセット
    setFormData({
      name: '',
      email: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    
    // 成功メッセージ
    setSnackbar({
      open: true,
      message: `プロフィールが更新されました (${response.changedFields.join(', ')})`,
      severity: 'success'
    });

  } catch (error) {
    if (error.response?.data?.details) {
      setErrors(error.response.data.details);
    } else {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'エラーが発生しました',
        severity: 'error'
      });
    }
  } finally {
    setSaving(false);
  }
};
```

## 5. バックエンド実装

### 5.1 ルート実装

```javascript
// /web/src/routes/auth.js に追加

// プロフィール統合更新
fastify.put('/profile', { 
  preHandler: fastify.authenticate 
}, async (request, reply) => {
  try {
    // バリデーション
    const { error, value } = updateProfileSchema.validate(request.body);
    if (error) {
      return reply.code(400).send({ 
        error: 'VALIDATION_ERROR', 
        message: '入力内容にエラーがあります',
        details: error.details.reduce((acc, detail) => {
          acc[detail.path[0]] = detail.message;
          return acc;
        }, {})
      });
    }

    const { name, email, currentPassword, newPassword } = value;
    const user = await User.findById(request.user.userId);
    
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const changedFields = [];
    const updates = {};

    // ユーザー名の更新
    if (name && name !== user.name) {
      await user.updateName(name);
      updates.name = name;
      changedFields.push('name');
    }

    // メールアドレスの更新
    if (email && email !== user.email) {
      await user.updateEmail(email);
      updates.email = email;
      changedFields.push('email');
    }

    // パスワードの更新
    if (currentPassword && newPassword) {
      await user.changePassword(currentPassword, newPassword);
      changedFields.push('password');
    }

    // 何も変更されていない場合
    if (changedFields.length === 0) {
      return reply.code(400).send({
        error: 'NO_CHANGES',
        message: '変更する項目がありません'
      });
    }

    // 更新されたユーザー情報を取得
    const updatedUser = await User.findById(request.user.userId);

    return reply.send({
      message: 'プロフィールが正常に更新されました',
      user: updatedUser.toJSON(),
      changedFields
    });

  } catch (error) {
    fastify.log.error(error);
    
    if (error.message === 'NAME_ALREADY_EXISTS') {
      return reply.code(409).send({ 
        error: 'VALIDATION_ERROR',
        message: '入力内容にエラーがあります',
        details: { name: 'このユーザー名は既に使用されています' }
      });
    }
    
    if (error.message === 'EMAIL_ALREADY_EXISTS') {
      return reply.code(409).send({ 
        error: 'VALIDATION_ERROR',
        message: '入力内容にエラーがあります',
        details: { email: 'このメールアドレスは既に使用されています' }
      });
    }
    
    if (error.message === 'Current password is incorrect') {
      return reply.code(401).send({ 
        error: 'VALIDATION_ERROR',
        message: '入力内容にエラーがあります',
        details: { currentPassword: '現在のパスワードが正しくありません' }
      });
    }
    
    return reply.code(500).send({ 
      error: 'INTERNAL_SERVER_ERROR',
      message: 'サーバーエラーが発生しました' 
    });
  }
});
```

### 5.2 User.js モデル拡張

```javascript
// ユーザー名更新メソッド
async updateName(newName) {
  // 同じ名前の場合は更新不要
  if (newName === this.name) {
    return;
  }

  // 重複チェック
  const existingUser = await User.findByName(newName);
  if (existingUser && existingUser.id !== this.id) {
    throw new Error('NAME_ALREADY_EXISTS');
  }

  // ユーザー名の更新
  await database.query(
    'UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newName, this.id]
  );

  this.name = newName;
  this.updatedAt = new Date();
}

// メールアドレス更新メソッド
async updateEmail(newEmail) {
  // 同じメールアドレスの場合は更新不要
  if (newEmail === this.email) {
    return;
  }

  // 重複チェック
  const existingUser = await User.findByEmail(newEmail);
  if (existingUser && existingUser.id !== this.id) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  // メールアドレスの更新
  await database.query(
    'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newEmail, this.id]
  );

  this.email = newEmail;
  this.updatedAt = new Date();
}
```

### 5.3 バリデーションスキーマ追加

```javascript
// /web/src/schemas/validation.js に追加

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(64).optional().messages({
    'string.min': 'ユーザー名は2文字以上で入力してください',
    'string.max': 'ユーザー名は64文字以下で入力してください'
  }),
  email: Joi.string().email().optional().messages({
    'string.email': '正しいメールアドレスを入力してください'
  }),
  currentPassword: Joi.string().when('newPassword', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.required': 'パスワード変更時は現在のパスワードが必要です'
  }),
  newPassword: Joi.string().min(8).pattern(/^(?=.*[a-zA-Z])(?=.*[0-9])/).when('currentPassword', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'string.min': 'パスワードは8文字以上で入力してください',
    'string.pattern.base': 'パスワードは英数字を含む必要があります',
    'any.required': '新しいパスワードは必須です'
  })
}).min(1).messages({
  'object.min': '変更する項目を少なくとも一つ入力してください'
});
```

## 6. セキュリティ考慮事項

### 6.1 認証・認可

- JWT認証必須（既存のauth middleware使用）
- 自分のプロフィールのみ更新可能
- セッション管理とトークン検証

### 6.2 データ検証

- フロントエンド・バックエンド両方でバリデーション実施
- SQLインジェクション対策（パラメータ化クエリ使用）
- XSS対策（入力値のエスケープ）

### 6.3 パスワード管理

- 現在のパスワード照合必須
- bcryptによるハッシュ化（saltRounds=12）
- パスワード変更時の再認証機能（将来実装）

### 6.4 レート制限

- プロフィール更新APIに対するレート制限
- ブルートフォース攻撃対策

## 7. エラーハンドリング

### 7.1 フロントエンド

```javascript
const errorMessages = {
  NAME_ALREADY_EXISTS: 'このユーザー名は既に使用されています',
  EMAIL_ALREADY_EXISTS: 'このメールアドレスは既に使用されています',
  CURRENT_PASSWORD_INCORRECT: '現在のパスワードが正しくありません',
  VALIDATION_ERROR: '入力内容を確認してください',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  SERVER_ERROR: 'サーバーエラーが発生しました'
};
```

### 7.2 バックエンド

```javascript
// 適切なHTTPステータスコードとエラーメッセージを返却
// 400: バリデーションエラー
// 401: 認証エラー
// 409: 重複エラー
// 500: サーバーエラー
```

## 8. レスポンシブ対応

- Material-UIのGrid SystemとBreakpointを使用
- モバイル・タブレット・デスクトップに対応
- タッチインターフェース最適化

## 9. アクセシビリティ

- WAI-ARIA準拠
- キーボードナビゲーション対応
- スクリーンリーダー対応
- カラーコントラスト確保

## 10. 実装優先度

### Phase 1 (高優先度)
- [x] ユーザー情報表示機能（既存のGET /api/auth/me利用）
- [ ] 統合プロフィール更新API（PUT /api/auth/profile）
- [ ] 統合プロフィール更新フォーム（UserProfile.js）
- [ ] バリデーション機能（フロントエンド・バックエンド）

### Phase 2 (中優先度)
- [ ] エラーハンドリング強化
- [ ] ローディング状態の改善
- [ ] 変更検知とフォーム状態管理
- [ ] ユーザビリティ向上（プレースホルダー、ヘルプテキスト等）

### Phase 3 (低優先度)
- [ ] メール認証機能
- [ ] アカウント削除機能
- [ ] プロフィール画像機能

## 11. URL構造の追加

```
/profile                    # ユーザープロフィール管理画面
```

## 12. 今後の拡張予定

- プロフィール画像のアップロード機能
- メールアドレス変更時の認証メール機能
- アカウント削除機能
- 二段階認証の設定
- ログイン履歴の表示
- パスワード強度チェッカー
- アカウント設定のエクスポート/インポート機能
