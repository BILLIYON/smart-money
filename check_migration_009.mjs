// Run with: node --experimental-vm-modules migrate009.mjs
// OR: npx tsx migrate009.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gmbwrhdoyoinkmtrtbnr.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4OTUzMSwiZXhwIjoyMDkxMjY1NTMxfQ.8uFfLI-KNwj3vLSpvwEhTcwjmD9-KUG5wYFz9FELt7c';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Test if columns already exist by trying to select them
const { data: colCheck, error: colErr } = await supabase
  .from('users')
  .select('is_verified')
  .limit(1);

if (colCheck !== null) {
  console.log('✅ Column is_verified already exists on users table — migration already applied.');
  process.exit(0);
}

if (colErr && colErr.code === '42703') {
  console.log('Column missing — needs migration. Please run the SQL manually in Supabase SQL Editor:');
} else if (colErr) {
  console.log('Check result:', JSON.stringify(colErr));
}

console.log(`
Run this SQL in Supabase Dashboard → SQL Editor:
=================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_name text,
  ADD COLUMN IF NOT EXISTS verification_nin text;

ALTER TABLE public.buddies
  ADD COLUMN IF NOT EXISTS creator_share_pct integer NOT NULL DEFAULT 70;
=================================================
`);
