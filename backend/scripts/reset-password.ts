import { supabaseAdmin } from '../src/shared/supabase';

const TARGET_EMAIL = 'workspaceowner@zoikogroup.com';
const NEW_PASSWORD = 'Password123!';

async function run() {
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) { console.error('LIST ERROR:', listError.message); process.exit(1); }

  const user = users.find((u: any) => u.email === TARGET_EMAIL);
  if (!user) { console.error(`User not found: ${TARGET_EMAIL}`); process.exit(1); }

  console.log('Found user:', user.id);
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: NEW_PASSWORD });
  if (error) { console.error('UPDATE ERROR:', error.message); process.exit(1); }

  console.log(`Password reset for ${TARGET_EMAIL}`);
}

run().catch(console.error);
