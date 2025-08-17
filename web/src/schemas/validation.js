// バリデーションスキーマ
import Joi from 'joi';

// 認証関連のスキーマ
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

export const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('user', 'admin').default('user')
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
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  price: Joi.number().integer().min(1).required(),
  rates: Joi.string().required(),
  image_url: Joi.string().uri().optional(),
  is_active: Joi.boolean().default(true),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional()
});
