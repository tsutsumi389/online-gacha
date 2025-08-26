-- New consolidated seed data
-- For users, gachas, and gacha_items

-- Clear existing data (use TRUNCATE with CASCADE for dependent tables)
TRUNCATE TABLE gacha_results CASCADE;
TRUNCATE TABLE gacha_items CASCADE;
TRUNCATE TABLE gachas CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE gacha_images CASCADE; -- Also clear gacha_images if it exists
TRUNCATE TABLE item_images CASCADE; -- Also clear item_images if it exists
TRUNCATE TABLE image_variants CASCADE;
TRUNCATE TABLE item_image_variants CASCADE;
TRUNCATE TABLE admin_operation_logs CASCADE;


-- Users data
-- Passwords are 'password123' hashed with bcrypt (12 rounds)
INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES
(1, 'Test User 1', 'user1@example.com', '$2b$12$VXkLzNZjHbYGK6pRWz/n5eIE0a4KFR1uEJ.nBNKKYyf7p7PZGw7/a', NOW(), NOW()),
(2, 'Test User 2', 'user2@example.com', '$2b$12$VXkLzNZjHbYGK6pRWz/n5eIE0a4KFR1uEJ.nBNKKYyf7p7PZGw7/a', NOW(), NOW());

-- Gachas data
INSERT INTO gachas (id, name, description, price, user_id, is_public, display_from, display_to, created_at, updated_at) VALUES
(1, 'Beginner Gacha', 'A gacha for new players.', 100, 1, TRUE, NOW(), NOW() + INTERVAL '30 days', NOW(), NOW()),
(2, 'Premium Gacha', 'Rare items can be found here!', 500, 1, TRUE, NOW(), NOW() + INTERVAL '60 days', NOW(), NOW()),
(3, 'User 2 Gacha', 'Gacha created by Test User 2.', 200, 2, TRUE, NOW(), NOW() + INTERVAL '15 days', NOW(), NOW());

-- Gacha Items data
INSERT INTO gacha_items (id, gacha_id, name, description, stock, is_public, created_at, updated_at) VALUES
(1, 1, 'Common Item A', 'A common item.', 100, TRUE, NOW(), NOW()),
(2, 1, 'Uncommon Item B', 'A slightly less common item.', 50, TRUE, NOW(), NOW()),
(3, 1, 'Rare Item C', 'A rare item!', 10, TRUE, NOW(), NOW()),
(4, 2, 'Super Rare Item X', 'Extremely rare!', 5, TRUE, NOW(), NOW()),
(5, 2, 'Legendary Item Y', 'The rarest item in the game!', 1, TRUE, NOW(), NOW()),
(6, 3, 'User 2 Common', 'A common item from User 2.', 80, TRUE, NOW(), NOW()),
(7, 3, 'User 2 Rare', 'A rare item from User 2.', 15, TRUE, NOW(), NOW());

-- Reset sequence for tables with SERIAL primary keys if needed, after TRUNCATE
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('gachas_id_seq', (SELECT MAX(id) FROM gachas));
SELECT setval('gacha_items_id_seq', (SELECT MAX(id) FROM gacha_items));
SELECT setval('gacha_results_id_seq', (SELECT MAX(id) FROM gacha_results));
SELECT setval('gacha_images_id_seq', (SELECT MAX(id) FROM gacha_images));
SELECT setval('item_images_id_seq', (SELECT MAX(id) FROM item_images));
SELECT setval('image_variants_id_seq', (SELECT MAX(id) FROM image_variants));
SELECT setval('item_image_variants_id_seq', (SELECT MAX(id) FROM item_image_variants));
SELECT setval('admin_operation_logs_id_seq', (SELECT MAX(id) FROM admin_operation_logs));
