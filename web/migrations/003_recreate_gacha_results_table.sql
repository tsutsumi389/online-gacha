-- Up Migration
-- Drop the existing table to recreate it with proper constraints and indexes
DROP TABLE gacha_results;

-- Recreate the gacha_results table based on the new design
CREATE TABLE gacha_results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    gacha_id INTEGER NOT NULL,
    gacha_item_id INTEGER NOT NULL,
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gacha_results_user
        FOREIGN KEY(user_id) 
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_gacha_results_gacha
        FOREIGN KEY(gacha_id) 
        REFERENCES gachas(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_gacha_results_gacha_item
        FOREIGN KEY(gacha_item_id) 
        REFERENCES gacha_items(id)
        ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX idx_gacha_results_user_id ON gacha_results(user_id);
CREATE INDEX idx_gacha_results_gacha_id ON gacha_results(gacha_id);
CREATE INDEX idx_gacha_results_gacha_item_id ON gacha_results(gacha_item_id);

-- Down Migration
-- To revert, we would recreate the original table from 001_initial_schema.sql
/*
DROP TABLE gacha_results;
CREATE TABLE gacha_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  gacha_id INTEGER REFERENCES gachas(id),
  gacha_item_id INTEGER REFERENCES gacha_items(id),
  executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
*/
