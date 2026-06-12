/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enterprise Data Seeder: Populates a rich demo environment.
 */
async function seed() {
  console.log('🚀 Initiating Enterprise Data Seeding...');

  // 1. Create a Demo Workspace if it doesn't exist
  const demoWorkspaceId = '00000000-0000-0000-0000-000000000000';

  // Get existing user IDs for notification seeds
  const { data: existingUsers } = await supabaseAdmin
    .from('public.users')
    .select('id')
    .limit(5);

  const userIds = (existingUsers || []).map(u => u.id);
  const defaultUserId = userIds[0] || '00000000-0000-0000-0000-000000000000';

  // 2. Seed Agents
  const agents = [
    { id: uuidv4(), org_id: demoWorkspaceId, workspace_id: demoWorkspaceId, name: 'Forensic Observer', status: 'ACTIVE', autonomy_level: 'FULL', type: 'governance', trust_score: 0.92 },
    { id: uuidv4(), org_id: demoWorkspaceId, workspace_id: demoWorkspaceId, name: 'Brand Guardian', status: 'ACTIVE', autonomy_level: 'MONITORED', type: 'governance', trust_score: 0.78 },
    { id: uuidv4(), org_id: demoWorkspaceId, workspace_id: demoWorkspaceId, name: 'Content Oracle', status: 'PAUSED', autonomy_level: 'RESTRICTED', type: 'content', trust_score: 0.45 },
  ];

  for (const agent of agents) {
    await supabaseAdmin.from('agents').upsert({ ...agent, updated_at: new Date().toISOString() }, { onConflict: 'name' });
  }

  // 3. Seed Publish Intents (History)
  const intents: any[] = [
    { workspace_id: demoWorkspaceId, content: 'Exploring the future of decentralized AI in enterprise governance.', platform: 'linkedin', status: 'APPROVED', risk_score: 12, risk_level: 'LOW', feedback: null, creator_id: defaultUserId },
    { workspace_id: demoWorkspaceId, content: 'Unregulated AI models are a risk to brand integrity.', platform: 'twitter', status: 'REJECTED', risk_score: 85, risk_level: 'CRITICAL', feedback: 'Too aggressive tone for brand standards.', creator_id: defaultUserId },
    { workspace_id: demoWorkspaceId, content: 'Scaling intelligence with ZoikoVertex. The new standard for agency control.', platform: 'linkedin', status: 'PENDING_REVIEW', risk_score: 45, risk_level: 'MEDIUM', feedback: null, creator_id: defaultUserId },
    { workspace_id: demoWorkspaceId, content: 'New product launch: AI-powered brand safety suite', platform: 'meta', status: 'PENDING_GOVERNANCE', risk_score: 72, risk_level: 'HIGH', feedback: null, creator_id: defaultUserId },
    { workspace_id: demoWorkspaceId, content: 'Customer testimonial with financial projections', platform: 'linkedin', status: 'GOVERNANCE_BLOCKED', risk_score: 91, risk_level: 'CRITICAL', feedback: 'Contains unverified financial claims', creator_id: defaultUserId },
    { workspace_id: demoWorkspaceId, content: 'Quarterly brand update for Q2 2025', platform: 'meta', status: 'PENDING_APPROVAL', risk_score: 28, risk_level: 'LOW', feedback: null, creator_id: defaultUserId },
  ];

  for (const intent of intents) {
    await supabaseAdmin.from('publish_intents').insert(intent);
  }

  // 4. Seed Safety Policies
  const policies = [
    { id: 'POL-1715000000001', rule_id: 'RUL-COM-001', workspace_id: demoWorkspaceId, status: 'Active', domain: 'Compliance', risk_category: 'Financial Claims', severity: 'Critical', trigger_condition: 'payload contains "guarantee" OR "risk-free" OR "100% ROI"', enforcement_action: 'Block', agent_impact: 'High', evidence_required: 'true', escalation_path: 'Immediate escalation to Compliance Officer', version: '1.0.0', author_id: defaultUserId },
    { id: 'POL-1715000000002', rule_id: 'RUL-BRD-001', workspace_id: demoWorkspaceId, status: 'Active', domain: 'Brand', risk_category: 'Brand Safety', severity: 'High', trigger_condition: 'payload contains "competitor" OR "alternative to"', enforcement_action: 'Warn', agent_impact: 'Medium', evidence_required: 'true', escalation_path: 'Notify Brand Manager for review', version: '1.0.0', author_id: defaultUserId },
    { id: 'POL-1715000000003', rule_id: 'RUL-PII-001', workspace_id: demoWorkspaceId, status: 'Active', domain: 'Compliance', risk_category: 'Data Privacy', severity: 'Critical', trigger_condition: 'payload contains "SSN" OR "PII" OR "personal data"', enforcement_action: 'Quarantine', agent_impact: 'High', evidence_required: 'true', escalation_path: 'Immediate escalation to Data Protection Officer', version: '2.0.0', author_id: defaultUserId },
    { id: 'POL-1715000000004', rule_id: 'RUL-DRAFT-001', workspace_id: demoWorkspaceId, status: 'Draft', domain: 'Compliance', risk_category: 'Regulatory', severity: 'Medium', trigger_condition: 'payload mentions regulatory body', enforcement_action: 'Warn', agent_impact: 'Low', evidence_required: 'false', escalation_path: 'Flag for legal review', version: '0.5.0', author_id: defaultUserId },
  ];

  for (const policy of policies) {
    const { data: existing } = await supabaseAdmin
      .from('agent_safety_policies')
      .select('id')
      .eq('id', policy.id)
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin.from('agent_safety_policies').insert({ ...policy, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
  }

  // 5. Seed Enforcement Events
  const events = [
    { id: 'ENF-1715000001001', rule_id: 'RUL-COM-001', actor: 'system', workspace_id: demoWorkspaceId, input_reference: 'Content: "Get 100% ROI guaranteed"', decision: 'Block', reason_code: 'Matched financial claim trigger', created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: 'ENF-1715000001002', rule_id: 'RUL-BRD-001', actor: defaultUserId, workspace_id: demoWorkspaceId, input_reference: 'Content: "Better than competitor X"', decision: 'Warn', reason_code: 'Brand policy violation: competitor reference detected', created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: 'ENF-1715000001003', rule_id: 'RUL-PII-001', actor: 'system', workspace_id: demoWorkspaceId, input_reference: 'Content: "Please provide your SSN for verification"', decision: 'Quarantine', reason_code: 'Potential PII detected', created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
    { id: 'ENF-1715000001004', rule_id: 'RUL-COM-001', actor: defaultUserId, workspace_id: demoWorkspaceId, input_reference: 'Content: "Zero risk investment opportunity"', decision: 'Block', reason_code: 'Matched financial claim trigger', created_at: new Date(Date.now() - 48 * 3600000).toISOString() },
  ];

  for (const event of events) {
    const { data: existing } = await supabaseAdmin
      .from('agent_enforcement_events')
      .select('id')
      .eq('id', event.id)
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin.from('agent_enforcement_events').insert(event);
    }
  }

  // 6. Seed Notifications for existing users
  if (userIds.length > 0) {
    for (const uid of userIds) {
      const { data: existingNotifs } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('user_id', uid)
        .limit(1);
      if (existingNotifs && existingNotifs.length > 0) continue;

      const notifs = [
        { user_id: uid, title: 'Welcome to ZoikoVertex', body: 'Your account is ready. Start exploring the governance dashboard.', type: 'SUCCESS', link: '/dashboard', read: true, created_at: new Date(Date.now() - 72 * 3600000).toISOString() },
        { user_id: uid, title: 'Content Review Required', body: 'Your post "Scaling intelligence with ZoikoVertex" requires governance review.', type: 'GOVERNANCE', link: '/governance/approvals', read: false, created_at: new Date(Date.now() - 6 * 3600000).toISOString() },
        { user_id: uid, title: 'Policy Update: Financial Claims', body: 'A new Critical policy has been activated for Financial Claims compliance.', type: 'WARNING', link: '/governance/policies', read: false, created_at: new Date(Date.now() - 12 * 3600000).toISOString() },
        { user_id: uid, title: 'Approval Granted', body: 'Your LinkedIn post has been approved and queued for publishing.', type: 'SUCCESS', link: '/governance/approvals', read: false, created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
        { user_id: uid, title: 'Agent Trust Alert: Content Oracle', body: 'Trust score dropped below 0.5. Review agent performance.', type: 'ERROR', link: '/studio', read: false, created_at: new Date(Date.now() - 36 * 3600000).toISOString() },
        { user_id: uid, title: 'Enforcement Event: Content Blocked', body: 'A publish attempt was blocked by policy RUL-COM-001 (Financial Claims).', type: 'GOVERNANCE', link: '/governance/policies', read: false, created_at: new Date(Date.now() - 48 * 3600000).toISOString() },
      ];
      for (const notif of notifs) {
        await supabaseAdmin.from('notifications').insert(notif);
      }
    }
  }

  // 7. Seed System Logs
  const logs = [
    { level: 'info', service: 'RiskCommandCenter', message: 'Global security audit completed.' },
    { level: 'error', service: 'Auth', message: 'Unauthorized bypass attempt detected on cluster EU-1.' },
    { level: 'warn', service: 'Governance', message: 'Policy drift detected in Agent #42: Style consistency failing.' },
  ];

  for (const log of logs) {
    await supabaseAdmin.from('system_logs').insert(log);
  }

  console.log('✅ Seeding Complete. Demo environment is ready.');
}

seed().catch(err => console.error('❌ Seeding Failed:', err));
