-- シードデータ
-- ユーザー統一後のサンプルデータ

-- ユーザーデータ（一般ユーザーと管理者）
INSERT INTO users (name, email, password_hash, role, created_at, updated_at) VALUES
('田中太郎', 'tanaka@example.com', '$2b$10$dummy_hash_user1', 'user', NOW(), NOW()),
('佐藤花子', 'sato@example.com', '$2b$10$dummy_hash_user2', 'user', NOW(), NOW()),
('山田管理者', 'admin@example.com', '$2b$10$dummy_hash_admin1', 'admin', NOW(), NOW()),
('鈴木店長', 'suzuki@example.com', '$2b$10$dummy_hash_user3', 'user', NOW(), NOW());

-- ガチャデータ（すべてのユーザーが作成可能）
INSERT INTO gachas (name, description, price, user_id, is_public, display_from, display_to, created_at, updated_at) VALUES
('田中のお楽しみガチャ', '田中太郎が作成したガチャです！', 300, 1, true, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW()),
('佐藤のプレミアムガチャ', '佐藤花子の特別なガチャ', 500, 2, true, NOW(), NOW() + INTERVAL '60 days', NOW(), NOW()),
('管理者の限定ガチャ', '管理者が作成した限定ガチャ', 1000, 3, true, NOW(), NOW() + INTERVAL '7 days', NOW(), NOW()),
('鈴木店長のお得ガチャ', '鈴木店長のお得なガチャです', 200, 4, true, NOW(), NOW() + INTERVAL '14 days', NOW(), NOW());

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

-- 管理者の限定ガチャの商品
(3, '限定フィギュア', '管理者限定フィギュア', '/images/figure1.png', 3, true, NOW(), NOW()),
(3, '特別カード', '特別なカード', '/images/card1.png', 15, true, NOW(), NOW()),
(3, '記念品', '記念品です', '/images/memento1.png', 30, true, NOW(), NOW()),

-- 鈴木店長のお得ガチャの商品
(4, '店長のオススメ', '店長一押し商品', '/images/recommend1.png', 8, true, NOW(), NOW()),
(4, 'お得な詰め合わせ', 'お得セット', '/images/set1.png', 25, true, NOW(), NOW()),
(4, '日用品', '実用的なアイテム', '/images/daily1.png', 67, true, NOW(), NOW());
