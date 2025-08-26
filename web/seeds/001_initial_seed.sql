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
INSERT INTO gacha_items (id, gacha_id, name, description, image_url, stock, is_public, created_at, updated_at) VALUES
(1, 1, 'Common Item A', 'A common item.', 'https://via.placeholder.com/80x80/3498db/ffffff?text=Common+A', 100, TRUE, NOW(), NOW()),
(2, 1, 'Uncommon Item B', 'A slightly less common item.', 'https://via.placeholder.com/80x80/e74c3c/ffffff?text=Uncommon+B', 50, TRUE, NOW(), NOW()),
(3, 1, 'Rare Item C', 'A rare item!', 'https://via.placeholder.com/80x80/f39c12/ffffff?text=Rare+C', 10, TRUE, NOW(), NOW()),
(4, 2, 'Super Rare Item X', 'Extremely rare!', 'https://via.placeholder.com/80x80/9b59b6/ffffff?text=Super+X', 5, TRUE, NOW(), NOW()),
(5, 2, 'Legendary Item Y', 'The rarest item in the game!', 'https://via.placeholder.com/80x80/e67e22/ffffff?text=Legend+Y', 1, TRUE, NOW(), NOW()),
(6, 3, 'User 2 Common', 'A common item from User 2.', 'https://via.placeholder.com/80x80/27ae60/ffffff?text=User2+C', 80, TRUE, NOW(), NOW()),
(7, 3, 'User 2 Rare', 'A rare item from User 2.', 'https://via.placeholder.com/80x80/8e44ad/ffffff?text=User2+R', 15, TRUE, NOW(), NOW());

-- Sample gacha results for testing history
INSERT INTO gacha_results (id, user_id, gacha_id, gacha_item_id, executed_at, updated_at) VALUES
(1, 1, 1, 1, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
(2, 1, 1, 2, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
(3, 1, 2, 4, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
(4, 1, 1, 3, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(5, 1, 2, 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(6, 2, 3, 6, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),
(7, 2, 3, 7, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour');

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
