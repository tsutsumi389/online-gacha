// バリデーションスキーマ
import Joi from 'joi';

// 認証関連のスキーマ
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(64).required().messages({
    'string.min': 'ユーザー名は2文字以上で入力してください',
    'string.max': 'ユーザー名は64文字以下で入力してください',
    'any.required': 'ユーザー名は必須です'
  }),
  email: Joi.string().email().required().messages({
    'string.email': '正しいメールアドレスを入力してください',
    'any.required': 'メールアドレスは必須です'
  }),
  password: Joi.string().min(8).pattern(/^(?=.*[a-zA-Z])(?=.*[0-9])/).required().messages({
    'string.min': 'パスワードは8文字以上で入力してください',
    'string.pattern.base': 'パスワードは英数字を含む必要があります',
    'any.required': 'パスワードは必須です'
  })
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

// ガチャ関連のスキーマ
export const gachaDrawSchema = Joi.object({
  count: Joi.number().integer().min(1).max(10).default(1)
});

// ガチャ作成スキーマ（管理者用）
export const createGachaSchema = Joi.object({
  name: Joi.string().min(1).max(128).required(),
  description: Joi.string().max(1000).optional(),
  price: Joi.number().integer().min(1).required(),
  isPublic: Joi.boolean().default(true),
  displayFrom: Joi.date().optional(),
  displayTo: Joi.date().optional()
});

// ガチャ更新スキーマ（管理者用）
export const updateGachaSchema = Joi.object({
  name: Joi.string().min(1).max(128).optional(),
  description: Joi.string().max(1000).optional(),
  price: Joi.number().integer().min(1).optional(),
  isPublic: Joi.boolean().optional(),
  displayFrom: Joi.date().optional(),
  displayTo: Joi.date().optional()
});
