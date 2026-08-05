-- Migration: Add metadata column to buddies table
ALTER TABLE public.buddies ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
