-- 初期データ投入用シード（admins, users, gachas, gacha_items）

INSERT INTO admins (name, email, password_hash)
VALUES ('管理者A', 'admin@example.com', 'dummyhash');

INSERT INTO users (name, email, password_hash)
VALUES ('ユーザーA', 'usera@example.com', 'userhash'),
       ('ユーザーB', 'userb@example.com', 'userhash');

INSERT INTO gachas (name, description, price, admin_id)
VALUES ('サンプルガチャ', 'サンプル説明', 300, 1);

INSERT INTO gacha_items (gacha_id, name, description, image_url, stock, probability)
VALUES
  (1, '商品A', '説明A', 'https://example.com/itemA.png', 1, 0.5),
  (1, '商品B', '説明B', 'https://example.com/itemB.png', 1, 0.3),
  (1, '商品C', '説明C', 'https://example.com/itemC.png', 1, 0.2);
