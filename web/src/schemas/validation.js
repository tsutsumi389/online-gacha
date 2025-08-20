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
  name: Joi.string().min(1).max(128).required().messages({
    'string.min': 'ガチャ名は1文字以上で入力してください',
    'string.max': 'ガチャ名は128文字以下で入力してください',
    'any.required': 'ガチャ名は必須です'
  }),
  description: Joi.string().max(1000).optional().allow('').messages({
    'string.max': '説明は1000文字以下で入力してください'
  }),
  price: Joi.number().integer().min(1).required().messages({
    'number.min': '価格は1以上で入力してください',
    'number.integer': '価格は整数で入力してください',
    'any.required': '価格は必須です'
  }),
  isPublic: Joi.boolean().default(true),
  displayFrom: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().allow('', null),
    Joi.allow(null)
  ).optional(),
  displayTo: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().allow('', null),
    Joi.allow(null)
  ).optional()
});

// ガチャ更新スキーマ（管理者用）
export const updateGachaSchema = Joi.object({
  name: Joi.string().min(1).max(128).optional().messages({
    'string.min': 'ガチャ名は1文字以上で入力してください',
    'string.max': 'ガチャ名は128文字以下で入力してください'
  }),
  description: Joi.string().max(1000).optional().allow('').messages({
    'string.max': '説明は1000文字以下で入力してください'
  }),
  price: Joi.number().integer().min(1).optional().messages({
    'number.min': '価格は1以上で入力してください',
    'number.integer': '価格は整数で入力してください'
  }),
  isPublic: Joi.boolean().optional(),
  displayFrom: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().allow('', null),
    Joi.allow(null)
  ).optional(),
  displayTo: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().allow('', null),
    Joi.allow(null)
  ).optional()
});

// ガチャアイテム作成スキーマ
export const createGachaItemSchema = Joi.object({
  name: Joi.string().min(1).max(128).required().messages({
    'string.min': 'アイテム名は1文字以上で入力してください',
    'string.max': 'アイテム名は128文字以下で入力してください',
    'any.required': 'アイテム名は必須です'
  }),
  description: Joi.string().max(1000).optional().allow('').messages({
    'string.max': '説明は1000文字以下で入力してください'
  }),
  rarity: Joi.string().valid('common', 'rare', 'srare', 'ssr').default('common').messages({
    'any.only': 'レアリティは common, rare, srare, ssr のいずれかを選択してください'
  }),
  stock: Joi.number().integer().min(0).default(0).messages({
    'number.min': '在庫数は0以上で入力してください',
    'number.integer': '在庫数は整数で入力してください'
  }),
  imageUrl: Joi.string().uri().optional().allow('').messages({
    'string.uri': '画像URLの形式が正しくありません'
  }),
  isPublic: Joi.boolean().default(true)
});

// ガチャアイテム更新スキーマ
export const updateGachaItemSchema = Joi.object({
  name: Joi.string().min(1).max(128).optional().messages({
    'string.min': 'アイテム名は1文字以上で入力してください',
    'string.max': 'アイテム名は128文字以下で入力してください'
  }),
  description: Joi.string().max(1000).optional().allow('').messages({
    'string.max': '説明は1000文字以下で入力してください'
  }),
  rarity: Joi.string().valid('common', 'rare', 'srare', 'ssr').optional().messages({
    'any.only': 'レアリティは common, rare, srare, ssr のいずれかを選択してください'
  }),
  stock: Joi.number().integer().min(0).optional().messages({
    'number.min': '在庫数は0以上で入力してください',
    'number.integer': '在庫数は整数で入力してください'
  }),
  imageUrl: Joi.string().uri().optional().allow('').messages({
    'string.uri': '画像URLの形式が正しくありません'
  }),
  isPublic: Joi.boolean().optional()
});
