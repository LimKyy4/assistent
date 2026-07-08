-- Migration: Add user_id column for multi-user support (future)
-- 
-- This migration adds the foundation for multi-user data isolation.
-- Current implementation uses MY_JIDS env var for multi-JID message routing
-- but all users share the same database tables.
--
-- To enable true multi-user, uncomment and run this migration, then:
-- 1. Add user_id to every query filter
-- 2. Create a user registration flow via WhatsApp
-- 3. Create a users table

-- -- Users table
-- CREATE TABLE IF NOT EXISTS users (
--     id SERIAL PRIMARY KEY,
--     jid TEXT UNIQUE NOT NULL,
--     name TEXT,
--     lang TEXT DEFAULT 'id',
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- -- Add user_id to existing tables
-- ALTER TABLE dompet ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
-- ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
-- ALTER TABLE kategori_custom ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
-- ALTER TABLE jadwal ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- -- Indexes for performance
-- CREATE INDEX IF NOT EXISTS idx_transaksi_user_id ON transaksi(user_id);
-- CREATE INDEX IF NOT EXISTS idx_kategori_user_id ON kategori_custom(user_id);
-- CREATE INDEX IF NOT EXISTS idx_jadwal_user_id ON jadwal(user_id);
