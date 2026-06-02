import { supabaseAdmin } from '../shared/supabase';
import { logger } from '../shared/logger';
import { sendOrgDeletionWarning, sendOrgDeletedNotification } from '../services/email.service';

const POLL_INTERVAL = 6 * 60 * 60 * 1000; // every 6 hours
const INACTIVE_THRESHOLD_MONTHS = 12;
const WARNING_LEAD_DAYS = 15;
let workerRunning = false;

/**
 * Finds organizations inactive for 12+ months, sends a 15-day warning email
 * to the workspace owner, and marks deletion_warning_sent_at.
 */
async function sendDeletionWarnings() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - INACTIVE_THRESHOLD_MONTHS);

  const { data: inactiveOrgs, error } = await supabaseAdmin
    .from('organizations')
    .select('id, name')
    .is('deleted_at', null)
    .neq('status', 'DELETED')
    .is('deletion_warning_sent_at', null)
    .lt('last_active_at', cutoff.toISOString());

  if (error) {
    logger.error({ error }, '[org-inactivity] Failed to query inactive orgs');
    return;
  }
  if (!inactiveOrgs || inactiveOrgs.length === 0) return;

  for (const org of inactiveOrgs) {
    try {
      // Find all workspaces under this org
      const { data: workspaces } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('org_id', org.id);

      if (!workspaces || workspaces.length === 0) continue;

      const workspaceIds = workspaces.map((w) => w.id);

      // Find workspace owners
      const { data: owners } = await supabaseAdmin
        .from('workspace_members')
        .select('user_id')
        .in('workspace_id', workspaceIds)
        .eq('role', 'WORKSPACE_OWNER');

      if (!owners || owners.length === 0) continue;

      const ownerIds = [...new Set(owners.map((o) => o.user_id))];

      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .in('id', ownerIds);

      if (!users || users.length === 0) continue;

      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + WARNING_LEAD_DAYS);
      const deletionDateStr = deletionDate.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });

      for (const user of users) {
        if (!user.email) continue;
        await sendOrgDeletionWarning(org.name, org.id, user.email, deletionDateStr);
      }

      // Mark warning as sent
      await supabaseAdmin
        .from('organizations')
        .update({ deletion_warning_sent_at: new Date().toISOString() })
        .eq('id', org.id);

      logger.info({ orgId: org.id, orgName: org.name }, '[org-inactivity] Deletion warning sent');
    } catch (err) {
      logger.error({ err, orgId: org.id }, '[org-inactivity] Error processing warning for org');
    }
  }
}

/**
 * Deletes organizations whose 15-day warning period has elapsed.
 */
async function deleteExpiredOrgs() {
  const warningCutoff = new Date();
  warningCutoff.setDate(warningCutoff.getDate() - WARNING_LEAD_DAYS);

  const { data: expiredOrgs, error } = await supabaseAdmin
    .from('organizations')
    .select('id, name')
    .is('deleted_at', null)
    .neq('status', 'DELETED')
    .not('deletion_warning_sent_at', 'is', null)
    .lt('deletion_warning_sent_at', warningCutoff.toISOString());

  if (error) {
    logger.error({ error }, '[org-inactivity] Failed to query expired orgs');
    return;
  }
  if (!expiredOrgs || expiredOrgs.length === 0) return;

  for (const org of expiredOrgs) {
    try {
      // Find workspace owners to notify
      const { data: workspaces } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('org_id', org.id);

      const ownerEmails: string[] = [];
      if (workspaces && workspaces.length > 0) {
        const workspaceIds = workspaces.map((w) => w.id);
        const { data: owners } = await supabaseAdmin
          .from('workspace_members')
          .select('user_id')
          .in('workspace_id', workspaceIds)
          .eq('role', 'WORKSPACE_OWNER');

        if (owners && owners.length > 0) {
          const ownerIds = [...new Set(owners.map((o) => o.user_id))];
          const { data: users } = await supabaseAdmin
            .from('users')
            .select('email')
            .in('id', ownerIds);

          if (users) {
            for (const u of users) {
              if (u.email) ownerEmails.push(u.email);
            }
          }
        }
      }

      // Soft delete: mark as DELETED with deleted_at timestamp
      await supabaseAdmin
        .from('organizations')
        .update({
          status: 'DELETED',
          deleted_at: new Date().toISOString(),
        })
        .eq('id', org.id);

      // Also mark associated workspaces as DELETED
      if (workspaces && workspaces.length > 0) {
        await supabaseAdmin
          .from('workspaces')
          .update({ status: 'DELETED' })
          .eq('org_id', org.id);
      }

      // Notify owners
      for (const email of ownerEmails) {
        await sendOrgDeletedNotification(org.name, email);
      }

      logger.info({ orgId: org.id, orgName: org.name }, '[org-inactivity] Organization deleted due to inactivity');
    } catch (err) {
      logger.error({ err, orgId: org.id }, '[org-inactivity] Error deleting org');
    }
  }
}

async function runPass() {
  if (workerRunning) return;
  workerRunning = true;
  try {
    await sendDeletionWarnings();
    await deleteExpiredOrgs();
  } catch (err) {
    logger.error({ err }, '[org-inactivity] Worker pass error');
  } finally {
    workerRunning = false;
  }
}

export function initOrgInactivityWorker(): void {
  logger.info('[org-inactivity] Starting (poll every 6h)');
  runPass();
  setInterval(runPass, POLL_INTERVAL);
}
