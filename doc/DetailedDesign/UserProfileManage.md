# ユーザープロフィール管理画面 詳細設計書

## 1. 概要

ユーザーが自分のプロフィール情報（ユーザーアイコン、ユーザー名、メールアドレス、パスワード）を管理できる画面です。ログインしたユーザーのみアクセス可能で、安全性を考慮したバリデーション機能とSharp.js画像処理によるアイコン最適化機能を提供します。

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
│ │ ┌─────┐ ・ユーザーID: 123               │ │
│ │ │ [画] │ ・登録日時: 2025-01-01           │ │
│ │ │ 像  │ ・最終更新日時: 2025-01-15        │ │
│ │ └─────┘                                │ │
│ │ (現在のユーザーアイコン)                  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ プロフィール変更フォーム                  │ │
│ │                                         │ │
│ │ ユーザーアイコン変更                      │ │
│ │ ┌─────┐ [画像選択]ボタン                │ │
│ │ │ [新] │ [削除]ボタン                     │ │
│ │ │ 画像│ ※JPEG/PNG/GIF (最大5MB)          │ │
│ │ └─────┘                                │ │
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
  - ユーザーアイコン（現在設定されているアイコン画像、未設定時はデフォルトアバター）
  - ユーザーID（読み取り専用）
  - 登録日時
  - 最終更新日時

#### 2.3.2 統合プロフィール変更フォーム

**フォーム仕様**:
- 変更したい項目のみ入力する方式
- 空欄の項目は変更されない
- 保存ボタンは一つのみ

**入力項目**:

1. **ユーザーアイコン変更**（オプション）
   - 画像選択ボタン（ファイル選択ダイアログ）
   - 画像削除ボタン（現在のアイコンを削除してデフォルトに戻す）
   - プレビュー表示（選択された新しい画像のプレビュー）
   - 対応形式: JPEG, PNG, GIF
   - ファイルサイズ制限: 最大5MB
   - 処理: Sharp.jsによるAVIF形式への変換とリサイズ
   - アイコンサイズ: 32px, 64px, 128px, 256px（各サイズ自動生成）

1. **ユーザーアイコン変更**（オプション）
   - 画像選択ボタン（ファイル選択ダイアログ）
   - 画像削除ボタン（現在のアイコンを削除してデフォルトに戻す）
   - プレビュー表示（選択された新しい画像のプレビュー）
   - 対応形式: JPEG, PNG, GIF
   - ファイルサイズ制限: 最大5MB
   - 処理: Sharp.jsによるAVIF形式への変換とリサイズ
   - アイコンサイズ: 32px, 64px, 128px, 256px（各サイズ自動生成）

2. **ユーザー名変更**（オプション）
   - 新しいユーザー名入力フィールド
   - プレースホルダー: "変更する場合のみ入力してください"
   - バリデーション: 入力時のみ実行（2-64文字、重複チェック）

3. **メールアドレス変更**（オプション）
   - 新しいメールアドレス入力フィールド
   - プレースホルダー: "変更する場合のみ入力してください"
   - バリデーション: 入力時のみ実行（メール形式、重複チェック）

4. **パスワード変更**（オプション）
   - 現在のパスワード入力フィールド
   - 新しいパスワード入力フィールド
   - 新しいパスワード確認入力フィールド
   - バリデーション: 現在のパスワードが入力された場合のみ実行
   - 注意: パスワード変更時は3つ全てのフィールドが必須

**バリデーション仕様**:
- 何も変更されていない場合はフォーム送信無効
- アイコン画像：JPEG/PNG/GIF形式、最大5MB、自動AVIF変換
- パスワード変更時は現在のパスワード、新しいパスワード、確認パスワード全て必須
- ユーザー名・メールアドレスは個別に変更可能
- リアルタイムバリデーションで即座にエラー表示

**操作**:
- 保存ボタン押下で変更された項目のみサーバーに送信
- アイコン変更時は画像アップロード→Sharp.js処理→バリアント生成の流れ
- 成功時はスナックバーで通知、失敗時はエラーメッセージ表示
- パスワード変更成功時は再ログインを推奨

## 3. API設計

### 3.1 ユーザー情報取得（拡張）

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
    "avatarImageId": 123,
    "avatarImageUrl": "https://minio:9000/user-avatars/users/1/avatar_256.avif",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

### 3.2 ユーザーアイコンアップロード（新規）

```http
POST /api/auth/avatar
Content-Type: multipart/form-data
```

**Request**:
```
avatar: (file) // JPEG/PNG/GIF, 最大5MB
```

**Response**:
```json
{
  "message": "アイコンが正常にアップロードされました",
  "avatarImage": {
    "id": 123,
    "originalFilename": "avatar.jpg",
    "processingStatus": "completed",
    "variants": {
      "avatar_32": "https://minio:9000/user-avatars/users/1/avatar_32.avif",
      "avatar_64": "https://minio:9000/user-avatars/users/1/avatar_64.avif",
      "avatar_128": "https://minio:9000/user-avatars/users/1/avatar_128.avif",
      "avatar_256": "https://minio:9000/user-avatars/users/1/avatar_256.avif"
    }
  }
}
```

### 3.3 ユーザーアイコン削除（新規）

```http
DELETE /api/auth/avatar
```

**Response**:
```json
{
  "message": "アイコンが削除されました"
}
```

### 3.4 プロフィール統合更新（拡張）

```http
PUT /api/auth/profile
```

**Request**:
```json
{
  "name": "新しいユーザー名",           // オプション
  "email": "newemail@example.com",    // オプション
  "currentPassword": "現在のパスワード", // パスワード変更時のみ必須
  "newPassword": "新しいパスワード",    // パスワード変更時のみ必須
  "avatarImageId": 123               // オプション（アイコン変更時）
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

*アイコンのみ変更:*
```json
{
  "avatarImageId": 123
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
  "email": "newemail@example.com",
  "avatarImageId": 123
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
    "avatarImageId": 123,
    "avatarImageUrl": "https://minio:9000/user-avatars/users/1/avatar_256.avif",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T11:00:00Z"
  },
  "changedFields": ["name", "email", "avatar"] // 実際に変更されたフィールド一覧
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
    "currentPassword": "現在のパスワードが正しくありません",
    "avatar": "画像ファイルの処理に失敗しました"
  }
}
```

## 4. データベース設計

### 4.1 user_avatar_images テーブル（新規）

```sql
CREATE TABLE user_avatar_images (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    base_object_key VARCHAR(500) NOT NULL,
    original_size INTEGER NOT NULL,
    original_mime_type VARCHAR(50) NOT NULL,
    processing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_user_avatar_images_original_size_positive CHECK (original_size > 0),
    CONSTRAINT ck_user_avatar_images_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_user_avatar_images_user_id ON user_avatar_images(user_id);
CREATE INDEX idx_user_avatar_images_processing_status ON user_avatar_images(processing_status);
```

### 4.2 user_avatar_variants テーブル（新規）

```sql
CREATE TABLE user_avatar_variants (
    id SERIAL PRIMARY KEY,
    user_avatar_image_id INTEGER NOT NULL REFERENCES user_avatar_images(id) ON DELETE CASCADE,
    size_type VARCHAR(20) NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_avatar_variants_unique UNIQUE (user_avatar_image_id, size_type),
    CONSTRAINT ck_user_avatar_variants_size_type CHECK (size_type IN ('avatar_32', 'avatar_64', 'avatar_128', 'avatar_256')),
    CONSTRAINT ck_user_avatar_variants_dimensions_positive CHECK (width > 0 AND height > 0),
    CONSTRAINT ck_user_avatar_variants_file_size_positive CHECK (file_size > 0)
);

CREATE INDEX idx_user_avatar_variants_user_avatar_image_id ON user_avatar_variants(user_avatar_image_id);
CREATE INDEX idx_user_avatar_variants_size_type ON user_avatar_variants(user_avatar_image_id, size_type);
```

### 4.3 users テーブル拡張

```sql
ALTER TABLE users ADD COLUMN avatar_image_id INTEGER REFERENCES user_avatar_images(id) ON DELETE SET NULL;
CREATE INDEX idx_users_avatar_image_id ON users(avatar_image_id);
```

## 5. フロントエンド実装

### 5.1 コンポーネント構成

```
UserProfile.js
├── UserInfoDisplay.js          // ユーザー情報表示（アイコン付き）
├── ProfileUpdateForm.js        // 統合プロフィール変更フォーム
│   ├── AvatarUpdateField.js    // アイコン変更フィールド（新規）
│   ├── NameUpdateField.js      // ユーザー名変更フィールド
│   ├── EmailUpdateField.js     // メールアドレス変更フィールド
│   └── PasswordUpdateFields.js // パスワード変更フィールド
└── DangerZoneSection.js        // 危険な操作（将来実装）
```

### 5.2 状態管理

```javascript
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [formData, setFormData] = useState({
  avatarFile: null,
  avatarPreview: null,
  avatarImageId: null,
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

### 5.3 バリデーション

```javascript
// Yupを使用したバリデーションスキーマ
const profileValidationSchema = yup.object({
  avatarFile: yup
    .mixed()
    .when('avatarFile', {
      is: (val) => val,
      then: yup.mixed()
        .test('fileSize', '画像ファイルは5MB以下にしてください', (value) => {
          return !value || value.size <= 5 * 1024 * 1024; // 5MB
        })
        .test('fileType', 'JPEG、PNG、GIF形式のファイルを選択してください', (value) => {
          return !value || ['image/jpeg', 'image/png', 'image/gif'].includes(value.type);
        }),
      otherwise: yup.mixed().notRequired()
    }),
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
  const hasAvatarChange = formData.avatarFile !== null;
  const hasNameChange = formData.name.trim() !== '';
  const hasEmailChange = formData.email.trim() !== '';
  const hasPasswordChange = formData.newPassword.trim() !== '';
  
  setHasChanges(hasAvatarChange || hasNameChange || hasEmailChange || hasPasswordChange);
}, [formData]);
```

### 5.4 アイコンアップロード処理

```javascript
// アイコンファイル選択処理
const handleAvatarFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    // ファイルバリデーション
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    
    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, avatarFile: '画像ファイルは5MB以下にしてください' }));
      return;
    }
    
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, avatarFile: 'JPEG、PNG、GIF形式のファイルを選択してください' }));
      return;
    }
    
    // プレビュー画像生成
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData(prev => ({
        ...prev,
        avatarFile: file,
        avatarPreview: e.target.result
      }));
      setErrors(prev => ({ ...prev, avatarFile: null }));
    };
    reader.readAsDataURL(file);
  }
};

// アイコンアップロード処理
const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append('avatar', file);
  
  try {
    const response = await profileAPI.uploadAvatar(formData);
    return response.avatarImage.id;
  } catch (error) {
    throw new Error('アイコンのアップロードに失敗しました');
  }
};
```

### 5.5 フォーム送信処理

```javascript
const handleSubmit = async (formValues) => {
  setSaving(true);
  setErrors({});

  try {
    let avatarImageId = null;
    
    // アイコンアップロード処理
    if (formValues.avatarFile) {
      avatarImageId = await uploadAvatar(formValues.avatarFile);
    }
    
    // 変更されたフィールドのみを送信データに含める
    const updateData = {};
    
    if (avatarImageId) {
      updateData.avatarImageId = avatarImageId;
    }
    
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
      avatarFile: null,
      avatarPreview: null,
      avatarImageId: null,
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

## 6. バックエンド実装

### 6.1 ユーザーアイコンアップロードルート実装

```javascript
// /web/src/routes/auth.js に追加

// アイコンアップロード
fastify.post('/avatar', {
  preHandler: [fastify.authenticate, fastify.upload.single('avatar')]
}, async (request, reply) => {
  try {
    const file = request.file;
    
    if (!file) {
      return reply.code(400).send({
        error: 'FILE_REQUIRED',
        message: '画像ファイルが必要です'
      });
    }

    // ファイルバリデーション
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    
    if (file.size > maxSize) {
      return reply.code(400).send({
        error: 'FILE_TOO_LARGE',
        message: 'ファイルサイズは5MB以下にしてください'
      });
    }
    
    if (!allowedTypes.includes(file.mimetype)) {
      return reply.code(400).send({
        error: 'INVALID_FILE_TYPE',
        message: 'JPEG、PNG、GIF形式のファイルを選択してください'
      });
    }

    const user = await User.findById(request.user.userId);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // アイコン画像をMinIOにアップロード・処理
    const avatarImage = await user.uploadAvatarImage(file);

    return reply.send({
      message: 'アイコンが正常にアップロードされました',
      avatarImage: {
        id: avatarImage.id,
        originalFilename: avatarImage.originalFilename,
        processingStatus: avatarImage.processingStatus,
        variants: avatarImage.variants
      }
    });

  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({
      error: 'UPLOAD_FAILED',
      message: 'アイコンのアップロードに失敗しました'
    });
  }
});

// アイコン削除
fastify.delete('/avatar', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const user = await User.findById(request.user.userId);
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    await user.removeAvatarImage();

    return reply.send({
      message: 'アイコンが削除されました'
    });

  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({
      error: 'DELETE_FAILED',
      message: 'アイコンの削除に失敗しました'
    });
  }
});
```

### 6.2 プロフィール統合更新ルート実装（拡張）

```javascript
// /web/src/routes/auth.js のPUTルートを拡張

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

    const { name, email, currentPassword, newPassword, avatarImageId } = value;
    const user = await User.findById(request.user.userId);
    
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const changedFields = [];

    // アイコンの更新
    if (avatarImageId && avatarImageId !== user.avatarImageId) {
      await user.updateAvatarImage(avatarImageId);
      changedFields.push('avatar');
    }

    // ユーザー名の更新
    if (name && name !== user.name) {
      await user.updateName(name);
      changedFields.push('name');
    }

    // メールアドレスの更新
    if (email && email !== user.email) {
      await user.updateEmail(email);
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
    
    if (error.message === 'AVATAR_NOT_FOUND') {
      return reply.code(404).send({ 
        error: 'VALIDATION_ERROR',
        message: '入力内容にエラーがあります',
        details: { avatar: '指定されたアイコン画像が見つかりません' }
      });
    }
    
    return reply.code(500).send({ 
      error: 'INTERNAL_SERVER_ERROR',
      message: 'サーバーエラーが発生しました' 
    });
  }
});
```

### 6.3 User.js モデル拡張

```javascript
// ユーザーアイコン画像アップロードメソッド
async uploadAvatarImage(file) {
  const UserAvatarImage = require('./UserAvatarImage');
  
  // 既存のアイコンがある場合は削除
  if (this.avatarImageId) {
    await this.removeAvatarImage();
  }
  
  // 新しいアイコン画像を作成
  const avatarImage = await UserAvatarImage.create({
    userId: this.id,
    originalFilename: file.originalname,
    originalSize: file.size,
    originalMimeType: file.mimetype,
    fileBuffer: file.buffer
  });
  
  // ユーザーのアイコンIDを更新
  await this.updateAvatarImage(avatarImage.id);
  
  return avatarImage;
}

// アイコン画像更新メソッド
async updateAvatarImage(avatarImageId) {
  const UserAvatarImage = require('./UserAvatarImage');
  
  // アイコン画像の存在確認
  const avatarImage = await UserAvatarImage.findById(avatarImageId);
  if (!avatarImage || avatarImage.userId !== this.id) {
    throw new Error('AVATAR_NOT_FOUND');
  }
  
  await database.query(
    'UPDATE users SET avatar_image_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [avatarImageId, this.id]
  );
  
  this.avatarImageId = avatarImageId;
  this.updatedAt = new Date();
}

// アイコン画像削除メソッド
async removeAvatarImage() {
  if (!this.avatarImageId) {
    return;
  }
  
  const UserAvatarImage = require('./UserAvatarImage');
  const avatarImage = await UserAvatarImage.findById(this.avatarImageId);
  
  if (avatarImage) {
    await avatarImage.delete(); // MinIOオブジェクトとDBレコードを削除
  }
  
  await database.query(
    'UPDATE users SET avatar_image_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [this.id]
  );
  
  this.avatarImageId = null;
  this.updatedAt = new Date();
}

// toJSON拡張（アイコンURL含む）
toJSON() {
  const result = {
    id: this.id,
    name: this.name,
    email: this.email,
    avatarImageId: this.avatarImageId,
    avatarImageUrl: null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
  
  // アイコンURLの生成
  if (this.avatarImageId) {
    result.avatarImageUrl = `https://minio:9000/user-avatars/users/${this.id}/avatar_256.avif`;
  }
  
  return result;
}
```

### 6.4 UserAvatarImage.js モデル（新規）

```javascript
// /web/src/models/UserAvatarImage.js

const database = require('../config/database');
const sharp = require('sharp');
const { minioClient, uploadToMinio, deleteFromMinio } = require('../utils/minio');

class UserAvatarImage {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.originalFilename = data.original_filename;
    this.baseObjectKey = data.base_object_key;
    this.originalSize = data.original_size;
    this.originalMimeType = data.original_mime_type;
    this.processingStatus = data.processing_status;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.variants = {};
  }

  static async create({ userId, originalFilename, originalSize, originalMimeType, fileBuffer }) {
    const baseObjectKey = `users/${userId}/avatar`;
    
    // データベースレコード作成
    const result = await database.query(
      `INSERT INTO user_avatar_images 
       (user_id, original_filename, base_object_key, original_size, original_mime_type, processing_status) 
       VALUES ($1, $2, $3, $4, $5, 'processing') 
       RETURNING *`,
      [userId, originalFilename, baseObjectKey, originalSize, originalMimeType]
    );
    
    const avatarImage = new UserAvatarImage(result.rows[0]);
    
    // 非同期で画像処理とアップロード
    process.nextTick(() => {
      avatarImage.processAndUpload(fileBuffer);
    });
    
    return avatarImage;
  }

  async processAndUpload(fileBuffer) {
    try {
      const variants = [
        { size: 32, name: 'avatar_32' },
        { size: 64, name: 'avatar_64' },
        { size: 128, name: 'avatar_128' },
        { size: 256, name: 'avatar_256' }
      ];

      for (const variant of variants) {
        // Sharp.jsで正方形にクロップしてリサイズし、AVIF形式に変換
        const processedBuffer = await sharp(fileBuffer)
          .resize(variant.size, variant.size, {
            fit: 'cover',
            position: 'center'
          })
          .avif({
            quality: 85,
            effort: 4
          })
          .toBuffer();

        // MinIOにアップロード
        const objectKey = `${this.baseObjectKey}_${variant.size}.avif`;
        const imageUrl = await uploadToMinio(
          'user-avatars',
          objectKey,
          processedBuffer,
          'image/avif'
        );

        // バリアントテーブルに保存
        await database.query(
          `INSERT INTO user_avatar_variants 
           (user_avatar_image_id, size_type, object_key, image_url, file_size, width, height) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [this.id, variant.name, objectKey, imageUrl, processedBuffer.length, variant.size, variant.size]
        );

        this.variants[variant.name] = imageUrl;
      }

      // 処理完了をマーク
      await database.query(
        'UPDATE user_avatar_images SET processing_status = $1 WHERE id = $2',
        ['completed', this.id]
      );
      
      this.processingStatus = 'completed';

    } catch (error) {
      console.error('Avatar image processing failed:', error);
      
      // 失敗をマーク
      await database.query(
        'UPDATE user_avatar_images SET processing_status = $1 WHERE id = $2',
        ['failed', this.id]
      );
      
      this.processingStatus = 'failed';
    }
  }

  static async findById(id) {
    const result = await database.query(
      'SELECT * FROM user_avatar_images WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const avatarImage = new UserAvatarImage(result.rows[0]);
    await avatarImage.loadVariants();
    return avatarImage;
  }

  async loadVariants() {
    const result = await database.query(
      'SELECT size_type, image_url FROM user_avatar_variants WHERE user_avatar_image_id = $1',
      [this.id]
    );
    
    this.variants = {};
    result.rows.forEach(row => {
      this.variants[row.size_type] = row.image_url;
    });
  }

  async delete() {
    // MinIOオブジェクトを削除
    const variants = await database.query(
      'SELECT object_key FROM user_avatar_variants WHERE user_avatar_image_id = $1',
      [this.id]
    );
    
    for (const variant of variants.rows) {
      await deleteFromMinio('user-avatars', variant.object_key);
    }
    
    // データベースレコードを削除（CASCADE DELETEでバリアントも削除される）
    await database.query(
      'DELETE FROM user_avatar_images WHERE id = $1',
      [this.id]
    );
  }
}

module.exports = UserAvatarImage;
```
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

### 6.5 バリデーションスキーマ追加

```javascript
// /web/src/schemas/validation.js に追加

export const updateProfileSchema = Joi.object({
  avatarImageId: Joi.number().integer().positive().optional().messages({
    'number.base': 'アイコン画像IDは数値である必要があります',
    'number.integer': 'アイコン画像IDは整数である必要があります',
    'number.positive': 'アイコン画像IDは正の数である必要があります'
  }),
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

// アイコンアップロード用バリデーション
export const avatarUploadSchema = Joi.object({
  avatar: Joi.object({
    size: Joi.number().max(5 * 1024 * 1024).messages({
      'number.max': 'ファイルサイズは5MB以下にしてください'
    }),
    mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif').messages({
      'any.only': 'JPEG、PNG、GIF形式のファイルを選択してください'
    })
  }).required().messages({
    'any.required': '画像ファイルが必要です'
  })
});
```

## 7. セキュリティ考慮事項

### 7.1 認証・認可

- JWT認証必須（既存のauth middleware使用）
- 自分のプロフィールのみ更新可能
- アイコン画像の所有者チェック
- セッション管理とトークン検証

### 7.2 データ検証

- フロントエンド・バックエンド両方でバリデーション実施
- ファイルアップロード時のMIMEタイプ・サイズ検証
- SQLインジェクション対策（パラメータ化クエリ使用）
- XSS対策（入力値のエスケープ）

### 7.3 画像セキュリティ

- ファイル形式・サイズの厳格な検証
- Sharp.jsによる安全な画像処理
- MinIO bucket のアクセス制御
- 悪意のあるファイルアップロード対策

### 7.4 パスワード管理

- 現在のパスワード照合必須
- bcryptによるハッシュ化（saltRounds=12）
- パスワード変更時の再認証機能（将来実装）

### 7.5 レート制限

- プロフィール更新APIに対するレート制限
- アイコンアップロードAPIに対するレート制限
- ブルートフォース攻撃対策

## 8. エラーハンドリング

### 8.1 フロントエンド

```javascript
const errorMessages = {
  // 基本エラー
  NAME_ALREADY_EXISTS: 'このユーザー名は既に使用されています',
  EMAIL_ALREADY_EXISTS: 'このメールアドレスは既に使用されています',
  CURRENT_PASSWORD_INCORRECT: '現在のパスワードが正しくありません',
  
  // アイコン関連エラー
  FILE_TOO_LARGE: 'ファイルサイズは5MB以下にしてください',
  INVALID_FILE_TYPE: 'JPEG、PNG、GIF形式のファイルを選択してください',
  UPLOAD_FAILED: 'アイコンのアップロードに失敗しました',
  AVATAR_NOT_FOUND: '指定されたアイコン画像が見つかりません',
  
  // システムエラー
  VALIDATION_ERROR: '入力内容を確認してください',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  SERVER_ERROR: 'サーバーエラーが発生しました'
};
```

### 8.2 バックエンド

```javascript
// 適切なHTTPステータスコードとエラーメッセージを返却
// 400: バリデーションエラー、ファイルエラー
// 401: 認証エラー
// 404: リソースが見つからない
// 409: 重複エラー
// 413: ファイルサイズ超過
// 415: サポートされていないメディアタイプ
// 500: サーバーエラー
```

## 9. レスポンシブ対応

- Material-UIのGrid SystemとBreakpointを使用
- モバイル・タブレット・デスクトップに対応
- タッチインターフェース最適化
- アイコンアップロードUIのモバイル対応

## 10. アクセシビリティ

- WAI-ARIA準拠
- キーボードナビゲーション対応
- スクリーンリーダー対応
- カラーコントラスト確保
- ファイル選択のアクセシビリティ対応

## 11. 実装優先度

### Phase 1 (高優先度)
- [x] ユーザー情報表示機能（既存のGET /api/auth/me利用）
- [ ] **ユーザーアイコン機能**:
  - [ ] データベーステーブル作成（user_avatar_images, user_avatar_variants）
  - [ ] UserAvatarImage.js モデル実装
  - [ ] アイコンアップロード API（POST /api/auth/avatar）
  - [ ] アイコン削除 API（DELETE /api/auth/avatar）
  - [ ] Sharp.js による画像処理・AVIF変換
- [ ] **プロフィール更新機能**:
  - [ ] 統合プロフィール更新API拡張（PUT /api/auth/profile）
  - [ ] User.js モデル拡張（アイコン関連メソッド）
  - [ ] 統合プロフィール更新フォーム（UserProfile.js）
- [ ] **バリデーション機能**:
  - [ ] フロントエンド・バックエンド画像バリデーション
  - [ ] 拡張バリデーションスキーマ

### Phase 2 (中優先度)
- [ ] **UI/UX改善**:
  - [ ] アイコンプレビュー機能
  - [ ] ドラッグ&ドロップファイルアップロード
  - [ ] プログレス表示（アップロード・処理中）
  - [ ] アイコンサイズ選択機能（32px, 64px, 128px, 256px）
- [ ] **エラーハンドリング強化**:
  - [ ] 詳細なエラーメッセージ
  - [ ] 画像処理失敗時のリトライ機能
  - [ ] ネットワークエラー対応
- [ ] **変更検知とフォーム状態管理**:
  - [ ] アイコン変更検知
  - [ ] フォーム状態の永続化

### Phase 3 (低優先度)
- [ ] **高度な画像機能**:
  - [ ] 画像クロップ機能
  - [ ] 複数サイズプレビュー
  - [ ] WebP/AVIF フォールバック
  - [ ] 画像最適化設定
- [ ] **システム機能**:
  - [ ] メール認証機能
  - [ ] アカウント削除機能
  - [ ] 使用容量表示
  - [ ] 画像履歴管理

### Phase 4 (将来実装)
- [ ] **拡張機能**:
  - [ ] 二段階認証の設定
  - [ ] ログイン履歴の表示
  - [ ] パスワード強度チェッカー
  - [ ] アカウント設定のエクスポート/インポート機能
  - [ ] プロフィールの公開範囲設定

## 12. URL構造の追加

```
/profile                    # ユーザープロフィール管理画面
```

## 13. MinIOストレージ構造

```
user-avatars/               # アイコン専用bucket
├── users/
│   ├── 1/                  # ユーザーID
│   │   ├── avatar_32.avif  # 32x32px アイコン
│   │   ├── avatar_64.avif  # 64x64px アイコン
│   │   ├── avatar_128.avif # 128x128px アイコン
│   │   └── avatar_256.avif # 256x256px アイコン（メイン）
│   ├── 2/
│   │   └── ...
│   └── ...
```

## 14. パフォーマンス考慮事項

### 14.1 画像処理最適化
- Sharp.js による高速画像処理
- AVIF形式による高圧縮・高品質
- 非同期バックグラウンド処理
- 複数サイズの並列生成

### 14.2 ストレージ最適化
- MinIO による高速オブジェクトストレージ
- 適切なMIMEタイプ設定
- CDN対応可能な URL 構造

### 14.3 フロントエンド最適化
- 画像遅延読み込み
- プレビュー時の適切なサイズ選択
- キャッシュ戦略の実装

## 15. 今後の拡張予定

- プロフィール画像のアップロード機能 → **アイコン機能として実装済み**
- メールアドレス変更時の認証メール機能
- アカウント削除機能
- 二段階認証の設定
- ログイン履歴の表示
- パスワード強度チェッカー
- アカウント設定のエクスポート/インポート機能
- **画像管理ダッシュボード**（新規）
- **アイコンテンプレート機能**（新規）
