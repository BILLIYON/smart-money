import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrl = envFile.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)/m)?.[1];
const envKey = envFile.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)/m)?.[1];

const supabase = createClient(envUrl!, envKey!);

async function run() {
  const { data, error } = await supabase.from('users').update({ is_admin: true }).neq('email', 'dummy@example.com').select();
  console.log('Update error:', error);
  console.log('Updated users:', data?.length);
}

run();
