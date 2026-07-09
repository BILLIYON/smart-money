import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const envUrl = envFile.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)/m)?.[1];
const envKey = envFile.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)/m)?.[1];

const supabase = createClient(envUrl!, envKey!);

async function run() {
  const email = 'methodstechnology1@gmail.com';
  const { data: usersData, error: err1 } = await supabase.auth.admin.listUsers();
  if (err1) {
    console.error(err1);
    return;
  }
  const user = usersData.users.find(u => u.email === email);
  if (!user) {
    console.log('User not found');
    return;
  }

  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password: 'Password123!'
  });

  if (error) {
    console.log('Error updating password:', error);
  } else {
    console.log('Password updated successfully for', data.user.email);
  }
}

run();
