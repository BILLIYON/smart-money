-- ════════════════════════════════════════════════════════════
-- Smart Money — Unique Index on Gmail Message ID
-- Migration: 011_gmail_unique_index
-- ════════════════════════════════════════════════════════════

-- Ensures databank_entries has a unique index on gmail_message_id
-- for ON CONFLICT upserts during Gmail sync & preview saving.

CREATE UNIQUE INDEX IF NOT EXISTS databank_entries_gmail_message_id_key
  ON public.databank_entries (gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;
