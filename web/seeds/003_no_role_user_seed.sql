-- 003_no_role_user_seed.sql
-- ロール機能を削除した後のシードデータ

-- 既存データをクリア
TRUNCATE TABLE gacha_results CASCADE;
TRUNCATE TABLE gacha_items CASCADE;
TRUNCATE TABLE gachas CASCADE;
TRUNCATE TABLE users CASCADE;

-- ユーザーデータ（全員平等）
-- パスワードは全て "password123" でbcryptハッシュ化済み
INSERT INTO users (name, email, password_hash, created_at, updated_at) VALUES
('田中太郎', 'tanaka@example.com', '$2b$12$VXkLzNZjHbYGK6pRWz/n5eIE0a4KFR1uEJ.nBNKKYyf7p7PZGw7/a', NOW(), NOW()),
('佐藤花子', 'sato@example.com', '$2b$12$VXkLzNZjHbYGK6pRWz/n5eIE0a4KFR1uEJ.nBNKKYyf7p7PZGw7/a', NOW(), NOW()),
('山田太郎', 'yamada@example.com', '$2b$12$VXkLzNZjHbYGK6pRWz/n5eIE0a4KFR1uEJ.nBNKKYyf7p7PZGw7/a', NOW(), NOW()),
('鈴木店長', 'suzuki@example.com', '$2b$12$VXkLzNZjHbYGK6pRWz/n5eIE0a4KFR1uEJ.nBNKKYyf7p7PZGw7/a', NOW(), NOW()),
('テストユーザー', 'test@example.com', '$2b$12$VXkLzNZjHbYGK6pRWz/n5eIE0a4KFR1uEJ.nBNKKYyf7p7PZGw7/a', NOW(), NOW());

-- ガチャデータ（全ユーザーが作成可能）
INSERT INTO gachas (name, description, price, user_id, is_public, display_from, display_to, created_at, updated_at) VALUES
('田中のお楽しみガチャ', '田中太郎が作成したガチャです！', 300, 1, true, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW()),
('佐藤のプレミアムガチャ', '佐藤花子の特別なガチャ', 500, 2, true, NOW(), NOW() + INTERVAL '60 days', NOW(), NOW()),
('山田の挑戦ガチャ', '山田太郎の挑戦的なガチャ', 1000, 3, true, NOW(), NOW() + INTERVAL '7 days', NOW(), NOW()),
('鈴木店長のお得ガチャ', '鈴木店長のお得なガチャです', 200, 4, true, NOW(), NOW() + INTERVAL '14 days', NOW(), NOW()),
('テストガチャ', 'テスト用のガチャです', 100, 5, true, NOW(), NOW() + INTERVAL '90 days', NOW(), NOW());

-- ガチャ商品データ
INSERT INTO gacha_items (gacha_id, name, description, image_url, stock, is_public, created_at, updated_at) VALUES
-- 田中のお楽しみガチャの商品
(1, 'レアアイテムA', '田中の一押しアイテム', '/images/item1.png', 10, true, NOW(), NOW()),
(1, 'ノーマルアイテムB', '普通のアイテム', '/images/item2.png', 50, true, NOW(), NOW()),
(1, 'コモンアイテムC', 'よくあるアイテム', '/images/item3.png', 100, true, NOW(), NOW()),

-- 佐藤のプレミアムガチャの商品
(2, 'プレミアムジュエル', '佐藤特製の宝石', '/images/jewel1.png', 5, true, NOW(), NOW()),
(2, 'シルバーコイン', '銀のコイン', '/images/coin1.png', 20, true, NOW(), NOW()),
(2, 'ブロンズメダル', '銅のメダル', '/images/medal1.png', 75, true, NOW(), NOW()),

-- 山田の挑戦ガチャの商品
(3, 'チャレンジトロフィー', '山田の挑戦証明', '/images/trophy1.png', 3, true, NOW(), NOW()),
(3, 'ゴールドスター', '金の星', '/images/star1.png', 15, true, NOW(), NOW()),
(3, 'シルバーバッジ', '銀のバッジ', '/images/badge1.png', 30, true, NOW(), NOW()),

-- 鈴木店長のお得ガチャの商品
(4, '店長特製クッキー', '鈴木店長手作りクッキー', '/images/cookie1.png', 25, true, NOW(), NOW()),
(4, 'お得券', '次回使える割引券', '/images/ticket1.png', 50, true, NOW(), NOW()),
(4, 'おまけアイテム', 'ちょっとしたおまけ', '/images/omake1.png', 100, true, NOW(), NOW()),

-- テストガチャの商品
(5, 'テストアイテムα', 'テスト用のレアアイテム', '/images/test1.png', 5, true, NOW(), NOW()),
(5, 'テストアイテムβ', 'テスト用の普通アイテム', '/images/test2.png', 20, true, NOW(), NOW()),
(5, 'テストアイテムγ', 'テスト用のコモンアイテム', '/images/test3.png', 75, true, NOW(), NOW());
