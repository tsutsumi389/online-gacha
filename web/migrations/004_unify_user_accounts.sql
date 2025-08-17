-- 004_unify_user_accounts.sql
-- ユーザーアカウントの統一
-- adminsテーブルをusersテーブルに統合し、role カラムで区別する

-- usersテーブルにroleカラムを追加
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';

-- 既存のadminsデータをusersテーブルに移行
INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
SELECT name, email, password_hash, 'admin', created_at, updated_at 
FROM admins;

-- gachasテーブルのadmin_idをuser_idに変更
ALTER TABLE gachas RENAME COLUMN admin_id TO user_id;

-- 外部キー制約を再設定
ALTER TABLE gachas DROP CONSTRAINT IF EXISTS gachas_admin_id_fkey;
ALTER TABLE gachas ADD CONSTRAINT gachas_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

-- admin_operation_logsテーブルのadmin_idをuser_idに変更
ALTER TABLE admin_operation_logs RENAME COLUMN admin_id TO user_id;
ALTER TABLE admin_operation_logs DROP CONSTRAINT IF EXISTS admin_operation_logs_admin_id_fkey;
ALTER TABLE admin_operation_logs ADD CONSTRAINT admin_operation_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

-- adminsテーブルを削除
DROP TABLE admins;
