/**
 * Fixes incorrectly elevated is_superadmin flags.
 *
 * Root cause: recreate_accounts.ts previously set is_superadmin=true for
 * WORKSPACE_OWNER and ADMIN roles. Real platform owners are identified by
 * NOT having a workspace_members entry — they are platform-scoped, not workspace-scoped.
 *
 * This script resets is_superadmin=false for any user who has a workspace_members
 * entry, since those users are workspace-scoped and should never be platform owners.
 *
 * Run: npx ts-node src/scripts/fix_superadmin_flag.ts
 */

import { supabaseAdmin } from '../shared/supabase';

async function fixSuperadminFlag() {
  console.log('🔍 Finding incorrectly elevated users...');

  // Find all users who have is_superadmin=true but also have workspace_members entries
  // Real superadmins are platform-level and have no workspace_members rows
  const { data: corruptedUsers, error: fetchError } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id, role, users!inner(id, email, is_superadmin)')
    .eq('users.is_superadmin', true);

  if (fetchError) {
    console.error('❌ Failed to fetch corrupted users:', fetchError.message);
    process.exit(1);
  }

  if (!corruptedUsers || corruptedUsers.length === 0) {
    console.log('✅ No corrupted users found. Database is clean.');
    return;
  }

  const uniqueUserIds = [...new Set(corruptedUsers.map((m: any) => m.user_id))];

  console.log(`⚠️  Found ${uniqueUserIds.length} user(s) with incorrect is_superadmin=true:`);
  corruptedUsers.forEach((m: any) => {
    const user = Array.isArray(m.users) ? m.users[0] : m.users;
    console.log(`   - ${user?.email} (role: ${m.role})`);
  });

  console.log('\n🔧 Resetting is_superadmin=false for these users...');

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ is_superadmin: false })
    .in('id', uniqueUserIds);

  if (updateError) {
    console.error('❌ Failed to update users:', updateError.message);
    process.exit(1);
  }

  console.log(`✅ Fixed ${uniqueUserIds.length} user(s). They will now see the correct workspace owner view.`);
}

fixSuperadminFlag().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
