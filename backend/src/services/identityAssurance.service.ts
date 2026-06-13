import { supabaseAdmin } from '../shared/supabase';
import { createAuditEvent } from './auditTrail.service';
import crypto from 'crypto';

function generateOpaqueId(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export async function triggerRecertification(params: { workspace_id: string; tenant_id: string }) {
  // Find all actors with high privileges (e.g. ADMIN, SUPERADMIN)
  // For the mockup, we will just fetch any actor with 'admin' authority class
  const { data: actors, error } = await supabaseAdmin
    .from('identity_actors')
    .select('*')
    .eq('workspace_id', params.workspace_id)
    .eq('authority_class', 'admin')
    .eq('state', 'active');

  if (error) throw error;

  const certifications = [];
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

  for (const actor of (actors || [])) {
    const cert = {
      certification_id: generateOpaqueId('CERT'),
      tenant_id: params.tenant_id,
      workspace_id: params.workspace_id,
      actor_id: actor.actor_id,
      reviewer_actor_id: null,
      role_id: actor.current_roles[0] || 'ADMIN',
      status: 'PENDING',
      due_at: ninetyDaysFromNow.toISOString(),
    };

    certifications.push(cert);
  }

  if (certifications.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('identity_access_certifications')
      .insert(certifications);

    if (insertError) throw insertError;
  }

  return certifications;
}

export async function reviewCertification(params: { certification_id: string; status: 'APPROVED' | 'REVOKED'; justification: string }) {
  const { data, error } = await supabaseAdmin
    .from('identity_access_certifications')
    .update({ 
      status: params.status, 
      justification: params.justification,
      reviewed_at: new Date().toISOString()
    })
    .eq('certification_id', params.certification_id)
    .select()
    .single();

  if (error) throw error;

  if (params.status === 'REVOKED') {
    const actorId = (data as Record<string, unknown>).actor_id as string;
    const workspaceId = (data as Record<string, unknown>).workspace_id as string;

    const { error: actorError } = await supabaseAdmin
      .from('identity_actors')
      .update({ state: 'revoked', updated_at: new Date().toISOString() })
      .eq('actor_id', actorId)
      .eq('workspace_id', workspaceId);

    if (actorError) throw actorError;

    await createAuditEvent({
      workspace_id: workspaceId,
      tenant_id: (data as Record<string, unknown>).tenant_id as string || (data as Record<string, unknown>).workspace_id as string,
      event_category: 'user_identity',
      event_type: 'identity.revoked',
      event_title: `Certification revocation for actor ${actorId}`,
      event_summary: params.justification,
      actor: { actor_id: 'system', actor_type: 'system' },
      object: { object_type: 'identity_actor', object_id: actorId },
      authority: { permission_used: 'identity:revoke' },
      risk_level: 'high',
      status: 'success',
      evidence_state: 'not_preserved',
      retention_class: 'REGULATED',
    });
  }

  return data;
}

export async function calculateIdentityAnomalyScore(params: { workspace_id: string; actor_id: string }) {
  // Query identity_graph_nodes to detect anomalies
  // For example, multiple IPs, impossible travel, or weird delegation chains
  const { data: nodes, error } = await supabaseAdmin
    .from('identity_graph_nodes')
    .select('*')
    .eq('workspace_id', params.workspace_id)
    .eq('actor_id', params.actor_id);

  if (error) throw error;

  let score = 0;
  const anomalies = [];

  const ips = (nodes || []).filter(n => n.node_type === 'IP');
  if (ips.length > 3) {
    score += 40;
    anomalies.push('Multiple diverse IP logins within 24h');
  }

  const chains = (nodes || []).filter(n => n.node_type === 'DELEGATION_CHAIN');
  if (chains.length > 2) {
    score += 30;
    anomalies.push('Complex nested delegation chain detected');
  }

  return {
    actor_id: params.actor_id,
    anomaly_score: score,
    risk_level: score > 60 ? 'HIGH' : score > 30 ? 'MEDIUM' : 'LOW',
    anomalies
  };
}


