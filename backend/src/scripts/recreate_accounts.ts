import { supabaseAdmin } from '../shared/supabase';

const ROLES = [
  'WORKSPACE_OWNER', 'ADMIN', 'MANAGER', 'SECURITY_ADMIN', 'GOVERNANCE_ADMIN',
  'AGENT_ARCHITECT', 'AGENT_OPERATOR', 'KNOWLEDGE_MANAGER', 'CAMPAIGN_MANAGER',
  'CREATOR', 'BRAND_REVIEWER', 'REVIEWER', 'VALIDATOR', 'APPROVER', 'PUBLISHER',
  'COMPLIANCE_REVIEWER', 'AUDITOR', 'PRIVACY_ADMIN', 'EXTERNAL_COLLABORATOR', 'VIEWER',
];

const NAMES = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Ethan', 'Fiona', 'George', 'Hannah', 
  'Isaac', 'Julia', 'Kevin', 'Lila', 'Mason', 'Nora', 'Oscar', 'Paige', 
  'Quinn', 'Riley', 'Samuel', 'Tessa'
];

async function recreateAccounts() {
  console.log('🧹 Deep Cleaning environment...');

  const developerEmail = 'developer@zoikogroup.com';
  const workspaceId = '00000000-0000-0000-0000-000000000000';
  const orgId = '00000000-0000-0000-0000-000000000001';

  // 1. Get all users from Auth
  const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers();
  const authUsers = authUsersData?.users || [];

  // 2. Clear table records first
  console.log('🗑️ Clearing table records...');
  const { data: devUser } = await supabaseAdmin.from('users').select('id').eq('email', developerEmail).single();
  
  if (devUser) {
    await supabaseAdmin.from('workspace_members').delete().neq('user_id', devUser.id);
    await supabaseAdmin.from('users').delete().neq('id', devUser.id);
  } else {
    await supabaseAdmin.from('workspace_members').delete().filter('workspace_id', 'eq', workspaceId);
    await supabaseAdmin.from('users').delete().neq('email', developerEmail);
  }

  // 3. Delete from Auth
  for (const user of authUsers) {
    if (user.email === developerEmail) continue;
    console.log(`Deleting Auth user: ${user.email}`);
    await supabaseAdmin.auth.admin.deleteUser(user.id);
  }

  console.log('⏳ Waiting for stabilization...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('🏗️ Rebuilding structural entities...');
  
  // Create Organization
  const { error: orgError } = await supabaseAdmin.from('organizations').upsert({
    id: orgId,
    name: 'ZoikoGroup',
    status: 'ACTIVE',
    plan_type: 'ENTERPRISE'
  });
  if (orgError) throw new Error(`Failed to create organization: ${orgError.message}`);

  // Create Workspace
  const { error: wsError } = await supabaseAdmin.from('workspaces').upsert({
    id: workspaceId,
    org_id: orgId,
    name: 'Zoiko Enterprise Delta',
    status: 'ACTIVE'
  });
  if (wsError) throw new Error(`Failed to create workspace: ${wsError.message}`);

  console.log('🏗️ Creating new role-based accounts...');
  const commonPassword = 'Password123!';

  for (let i = 0; i < ROLES.length; i++) {
    const role = ROLES[i];
    const name = NAMES[i % NAMES.length];
    const email = `${role.toLowerCase().replace(/_/g, '')}@zoikogroup.com`;
    
    if (email === developerEmail) continue;

    console.log(`Provisioning: ${name} (${email}) as ${role}`);

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: commonPassword,
      email_confirm: true,
      user_metadata: { full_name: name }
    });

    if (authError) {
      console.error(`Failed to create auth for ${email}:`, authError.message);
      continue;
    }

    const userId = authData.user.id;

    const { error: userError } = await supabaseAdmin.from('users').upsert({
      id: userId,
      email,
      full_name: name,
      is_superadmin: role === 'ADMIN' || role === 'WORKSPACE_OWNER' || role === 'DEVELOPER'
    });
    if (userError) console.error(`Failed to upsert user ${email}:`, userError.message);

    const { error: memberError } = await supabaseAdmin.from('workspace_members').upsert({
      workspace_id: workspaceId,
      user_id: userId,
      role: role
    });
    if (memberError) console.error(`Failed to create workspace member for ${email}:`, memberError.message);
  }

  console.log('✨ Success! Role-based environment with ZoikoGroup branding is ready.');
}

recreateAccounts().catch(err => console.error('FATAL:', err));
