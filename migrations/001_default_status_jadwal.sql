-- Migration: Add DEFAULT 'pending' to jadwal.status
-- Run this in Supabase SQL Editor or via CLI

ALTER TABLE jadwal
ALTER COLUMN status SET DEFAULT 'pending';

-- Also update existing NULL values to 'pending'
UPDATE jadwal SET status = 'pending' WHERE status IS NULL;
