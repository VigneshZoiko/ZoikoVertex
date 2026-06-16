import { supabaseAdmin } from '../src/shared/supabase';

const DEV_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

async function run() {
  const email = 'developer@zoikogroup.com';
  const password = 'Password123!';

  console.log('--- START GOD MODE PROVISIONING ---');

  // 1. Find or create the auth user
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('LIST ERROR:', listError.message);
    process.exit(1);
  }

  let user = users.find((u: any) => u.email === email);

  if (user) {
    console.log('User found:', user.id);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
    if (updateError) {
      console.error('UPDATE ERROR:', updateError.message);
    } else {
      console.log('Password updated.');
    }
  } else {
    console.log('User not found. Creating...');

    const { data: { user: newUser }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Developer (God Mode)' }
    });
    if (createError) {
      console.error('CREATE ERROR:', createError.message);
      process.exit(1);
    }
    // @ts-expect-error: createUser returns nested data structure; assign top-level user object
    user = newUser;
    console.log('User created:', user?.id);
  }

  if (!user) {
    console.error('No user — aborting.');
    process.exit(1);
  }

  // 2. Ensure org exists (dev org)
  const { error: orgError } = await supabaseAdmin.from('organizations').upsert({
    id: DEV_WORKSPACE_ID,
    name: 'Dev Org (God Mode)',
    status: 'ACTIVE',
    plan_type: 'ENTERPRISE'
  }, { onConflict: 'id' });
  if (orgError) console.warn('ORG UPSERT WARN:', orgError.message);
  else console.log('Dev org ensured.');

  // 3. Ensure workspace exists
  const { error: wsError } = await supabaseAdmin.from('workspaces').upsert({
    id: DEV_WORKSPACE_ID,
    name: 'Dev Workspace (God Mode)',
    org_id: DEV_WORKSPACE_ID,
    status: 'ACTIVE',
    type: 'BRAND'
  }, { onConflict: 'id' });
  if (wsError) console.warn('WORKSPACE UPSERT WARN:', wsError.message);
  else console.log('Dev workspace ensured.');

  // 4. Set is_superadmin in public.users
  const { error: upsertError } = await supabaseAdmin.from('users').upsert({
    id: user.id,
    email,
    full_name: 'Developer (God Mode)',
    is_superadmin: true
  }, { onConflict: 'id' });
  if (upsertError) {
    console.error('USER UPSERT ERROR:', upsertError.message);
    process.exit(1);
  }
  console.log('Superadmin flag set.');

  // 5. Add to workspace_members as WORKSPACE_OWNER
  const { error: memberError } = await supabaseAdmin.from('workspace_members').upsert({
    workspace_id: DEV_WORKSPACE_ID,
    user_id: user.id,
    role: 'WORKSPACE_OWNER'
  }, { onConflict: 'workspace_id,user_id' });
  if (memberError) console.warn('MEMBER UPSERT WARN:', memberError.message);
  else console.log('workspace_members row ensured (WORKSPACE_OWNER).');

  console.log('\n✓ God Mode fully provisioned for', email);
  console.log('--- FINISHED ---');
  process.exit(0);
}

run().catch(err => {
  console.error('UNCAUGHT ERROR:', err);
  process.exit(1);
});
