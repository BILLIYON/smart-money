import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrl = envFile.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)/m)?.[1];
const envKey = envFile.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)/m)?.[1];

const supabase = createClient(envUrl!, envKey!);

async function run() {
  const email = 'methodstechnology1@gmail.com';

  // 1. Set is_admin to false for everyone first
  const { data: d1, error: e1 } = await supabase.from('users').update({ is_admin: false }).neq('email', 'dummy_does_not_exist');
  console.log('Revoked admin from others', e1);

  // 2. Set is_admin to true for methodstechnology1@gmail.com
  const { data: d2, error: e2 } = await supabase.from('users').update({ is_admin: true }).eq('email', email).select();
  console.log('Granted admin to', email, e2);
  console.log('User found:', d2?.length);
}

run();
