import { supabaseAdmin } from '../shared/supabase';
import { logger } from '../shared/logger';

/**
 * Creates in-app notifications for a list of users by inserting into the
 * `notifications` table. Non-blocking — failures are logged but never thrown.
 */
export async function createNotifications(
  userIds: string[],
  title: string,
  body: string,
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'GOVERNANCE' | 'APPROVAL' | 'SYSTEM',
  link?: string,
): Promise<void> {
  if (userIds.length === 0) return;

  const rows = userIds.map((userId) => ({
    user_id: userId,
    title,
    body,
    type,
    link: link || null,
  }));

  const { error } = await supabaseAdmin.from('notifications').insert(rows);

  if (error) {
    // Table might not exist yet in fresh installations
    if (error.code === '42P01') {
      logger.warn('[inAppNotification] notifications table does not exist yet — skipping');
      return;
    }
    logger.error({ error }, '[inAppNotification] Failed to batch-insert notifications');
  }
}

/**
 * Finds all workspace members who hold admin-level roles.
 * Returns their user_id strings.
 */
export async function getWorkspaceAdmins(workspaceId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .in('role', ['ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN']);

  if (error) {
    logger.error({ error, workspaceId }, '[inAppNotification] Failed to fetch workspace admins');
    return [];
  }

  return (data || []).map((m: any) => m.user_id).filter(Boolean);
}
