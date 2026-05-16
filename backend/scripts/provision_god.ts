import { supabaseAdmin } from '../src/shared/supabase';

async function run() {
  const email = 'developer@zoikogroup.com';
  const password = 'Password123!';

  console.log('--- START PROVISIONING ---');
  
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
      console.log('Password updated successfully.');
    }
  } else {
    console.log('User not found. Creating...');
    // @ts-ignore
    const { data: { user: newUser }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Developer Mode' }
    });

    if (createError) {
      console.error('CREATE ERROR:', createError.message);
      process.exit(1);
    } else {
      // @ts-ignore
      user = newUser;
      console.log('User created successfully:', user?.id);
    }
  }

  if (user) {
    console.log('Ensuring superadmin status in public.users...');
    const { error: upsertError } = await supabaseAdmin.from('users').upsert({
      id: user.id,
      email: email,
      full_name: 'Developer Mode',
      is_superadmin: true
    });

    if (upsertError) {
      console.error('UPSERT ERROR:', upsertError.message);
      process.exit(1);
    } else {
      console.log('God Mode permissions set successfully.');
    }
  }

  console.log('--- FINISHED ---');
  process.exit(0);
}

run().catch(err => {
  console.error('UNCAUGHT ERROR:', err);
  process.exit(1);
});
