import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));

import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { DependencyNotificationPlanner } from '../../modules/prompts/services/DependencyNotificationPlanner';

const WS_A = 'ws-a';
const WS_B = 'ws-b';

function recipientFixtures() {
  return {
    prompts: [{ id: 'p1', workspace_id: WS_A, name: 'P1', status: 'production_active', current_version_id: 'v1', owner_id: 'o1', owner_name: 'Owner One', created_by: 'c1' }],
    prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1 }],
    prompt_bindings: [{ prompt_version_id: 'v1', agent_id: 'aX', environment: 'production' }],
    prompt_approvals: [{ prompt_version_id: 'v1', reviewer_role: 'compliance' }],
  };
}

beforeEach(() => resetFixtures());

describe('DependencyNotificationPlanner — severity gate & recipients', () => {
  it('HEALTHY target produces no notification entries (gate)', async () => {
    setFixtures(recipientFixtures());
    const plan = await DependencyNotificationPlanner.planNotifications({ targetType: 'agent', targetId: 'aX', workspaceId: WS_A });
    expect(plan.trigger.health.status).toBe('HEALTHY');
    expect(plan.notifications).toHaveLength(0);
    expect(plan.summary.notify_count).toBe(0);
    expect(plan.summary.highest_severity).toBe('none');
  });

  it('WARNING-and-above target plans owner + creator + approver recipients', async () => {
    setFixtures(recipientFixtures());
    const plan = await DependencyNotificationPlanner.planForAgentChange('aX', WS_A, { status: 'revoked' });
    expect(plan.severity).toBe('high');
    expect(plan.notifications).toHaveLength(1);

    const kinds = plan.notifications[0].recipients.map((r) => r.kind).sort();
    expect(kinds).toEqual(['approver', 'creator', 'owner']);
    expect(plan.notifications[0].blocking).toBe(true);
    expect(plan.summary.notify_count).toBe(1);
    expect(plan.summary.recipient_count).toBe(3);
    expect(plan.summary.blocking_count).toBe(1);
  });

  it('does not surface cross-tenant recipients (foreign workspace → empty)', async () => {
    setFixtures(recipientFixtures()); // bindings live in WS_A only
    const plan = await DependencyNotificationPlanner.planForAgentChange('aX', WS_B, { status: 'revoked' });
    expect(plan.notifications).toHaveLength(0);
    expect(plan.summary.recipient_count).toBe(0);
  });

  it('MISSING target (exists:false) is treated as critical and plans notifications', async () => {
    setFixtures(recipientFixtures());
    const plan = await DependencyNotificationPlanner.planForAgentChange('aX', WS_A, { exists: false });
    expect(plan.trigger.health.status).toBe('MISSING');
    expect(plan.severity).toBe('critical');
    expect(plan.notifications.length).toBeGreaterThan(0);
  });
});
