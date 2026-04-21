-- ════════════════════════════════════════════════════════════
-- Smart Money — Currency & Gmail Message ID columns
-- Migration: 004_currency
-- ════════════════════════════════════════════════════════════

-- Add currency to databank_entries.
-- Defaults to NGN; international users get their own code on insert.
ALTER TABLE public.databank_entries
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NGN';

-- Add gmail_message_id as a top-level unique column so gmail-sync can
-- upsert by it (previously it was buried in metadata JSON only).
ALTER TABLE public.databank_entries
  ADD COLUMN IF NOT EXISTS gmail_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS databank_entries_gmail_message_id_idx
  ON public.databank_entries (gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;
