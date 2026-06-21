-- Migration 008: Add Agent Limits to public.users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS limit_per_action bigint NOT null DEFAULT 5000000,
ADD COLUMN IF NOT EXISTS limit_daily bigint NOT null DEFAULT 15000000,
ADD COLUMN IF NOT EXISTS limit_monthly bigint NOT null DEFAULT 50000000;
