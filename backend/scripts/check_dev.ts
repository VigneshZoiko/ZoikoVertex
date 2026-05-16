import { supabaseAdmin } from '../src/shared/supabase';
async function run() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('is_superadmin, full_name, email')
      .eq('email', 'developer@zoikogroup.com')
      .maybeSingle();
    
    if (error) {
      console.error('DB ERROR:', error);
    } else {
      console.log('USER_CHECK_RESULT:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('FETCH ERROR:', err);
  }
  process.exit(0);
}
run();
