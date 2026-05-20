import { supabaseAdmin } from '../shared/supabase';

async function main() {
  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .update({ plan_type: 'ENTERPRISE' })
    .neq('id', 'no-match') // update all rows
    .select('id, name, plan_type');

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`Updated ${data?.length ?? 0} workspace(s) to ENTERPRISE:`);
  data?.forEach(w => console.log(`  - ${w.id}  ${w.name ?? '(no name)'}  → ${w.plan_type}`));
}

main();
