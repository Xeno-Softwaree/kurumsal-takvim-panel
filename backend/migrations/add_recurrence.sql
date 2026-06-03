-- Migration: add recurrence support to events table
-- Run this once against your Supabase/Neon database.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS recurrence_rule VARCHAR(20) DEFAULT NULL;

-- Allowed values: NULL (no recurrence), 'daily', 'weekly', 'monthly', 'yearly'
COMMENT ON COLUMN events.recurrence_rule IS 'Recurrence frequency: daily | weekly | monthly | yearly | NULL';
