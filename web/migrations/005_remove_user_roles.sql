-- 005_remove_user_roles.sql
-- ユーザーロール機能を削除し、全ユーザーが平等にガチャを管理できるようにする

-- users テーブルから role カラムを削除
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- gachas テーブルのコメントを更新（全ユーザーがガチャを作成可能）
COMMENT ON TABLE gachas IS '全ユーザーが作成・管理可能なガチャテーブル';
