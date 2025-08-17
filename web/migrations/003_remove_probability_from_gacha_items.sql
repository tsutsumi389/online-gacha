-- 003_remove_probability_from_gacha_items.sql
-- gacha_itemsテーブルから当選確率カラムを削除

ALTER TABLE gacha_items DROP COLUMN IF EXISTS probability;
