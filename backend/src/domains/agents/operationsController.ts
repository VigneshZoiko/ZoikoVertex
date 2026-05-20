import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { logToDatabase } from '../../shared/databaseLogger';
import { AuthRequest } from '../../shared/authMiddleware';

async function asyncMap<T, U>(arr: T[], fn: (item: T) => Promise<U>): Promise<U[]> {
  return Promise.all(arr.map(fn));
}

interface AgentRun {
  id: string;
  tenant_id: string;
  workspace_id: string;
  brand_id: string;
  environment: string;
  agent_id: string;
  agent_name: string;
  agent_type: string;
  workflow_id: string;
  workflow_name: string;
  workflow_version: string;
  task_id: string;
  task_objective: string;
  status: string;
  severity: string;
  owner_id: string;
  owner_name: string;
  priority: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  due_at: string | null;
  last_event_at: string;
  policy_result: string;
  evidence_status: string;
}

interface RunEvent {
  id: string;
  run_id: string;
  event_type: string;
  actor_type: string;
  actor_id: string;
  actor_name: string;
  previous_state: string | null;
  new_state: string;
  reason: string;
  payload_ref: string | null;
  created_at: string;
}

interface QueueItem {
  id: string;
  run_id: string;
  queue_type: string;
  priority: number;
  assignee_id: string | null;
  assignee_name: string | null;
  team_id: string | null;
  due_at: string | null;
  status: string;
  claimed_by: string | null;
  claimed_at: string | null;
  resolved_at: string | null;
}

interface Incident {
  id: string;
  run_id: string;
  run_name: string;
  severity: string;
  category: string;
  owner_id: string | null;
  owner_name: string | null;
  status: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  due_at: string | null;
  root_cause: string | null;
  remediation: string | null;
  closed_by: string | null;
  closed_at: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; severity: string }> = {
  SCHEDULED: { label: 'Scheduled', color: 'text-blue-400', severity: 'normal' },
  QUEUED: { label: 'Queued', color: 'text-amber-400', severity: 'attention' },
  RUNNING: { label: 'Running', color: 'text-emerald-400', severity: 'normal' },
  WAITING_HUMAN_REVIEW: { label: 'Waiting Review', color: 'text-purple-400', severity: 'warning' },
  POLICY_BLOCKED: { label: 'Policy Blocked', color: 'text-rose-400', severity: 'critical' },
  FAILED: { label: 'Failed', color: 'text-red-400', severity: 'critical' },
  PAUSED: { label: 'Paused', color: 'text-orange-400', severity: 'warning' },
  COMPLETED: { label: 'Completed', color: 'text-emerald-400', severity: 'normal' },
  QUARANTINED: { label: 'Quarantined', color: 'text-rose-400', severity: 'critical' },
};

export const listAgentRuns = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const { status, severity, owner_id, brand_id, channel, limit = 50, offset = 0 } = req.query;

    if (!workspaceId) {
      return res.status(403).json({ error: 'Workspace not found' });
    }

    let query = supabaseAdmin
      .from('agent_runs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) query = query.eq('status', status as string);
    if (severity) query = query.eq('severity', severity as string);
    if (owner_id) query = query.eq('owner_id', owner_id as string);
    if (brand_id) query = query.eq('brand_id', brand_id as string);

    const { data: runs, error } = await query;

    if (error) throw error;

    const runsWithMeta = (runs || []).map((run: AgentRun) => ({
      ...run,
      status_config: STATUS_MAP[run.status] || { label: run.status, color: 'text-gray-400', severity: 'normal' },
    }));

    const { count } = await supabaseAdmin
      .from('agent_runs')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    res.json({
      runs: runsWithMeta,
      total: count || 0,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to list agent runs');
    next(err);
  }
};

export const getAgentRun = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user?.workspace_id;

    const { data: run, error } = await supabaseAdmin
      .from('agent_runs')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error) throw error;
    if (!run) {
      return res.status(404).json({ error: 'Agent run not found' });
    }

    res.json({
      run: {
        ...run,
        status_config: STATUS_MAP[run.status] || { label: run.status, color: 'text-gray-400', severity: 'normal' },
      },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get agent run');
    next(err);
  }
};

export const getRunTimeline = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user?.workspace_id;

    const { data: run, error: runError } = await supabaseAdmin
      .from('agent_runs')
      .select('workspace_id')
      .eq('id', id)
      .single();

    if (runError || !run || run.workspace_id !== workspaceId) {
      return res.status(404).json({ error: 'Agent run not found' });
    }

    const { data: events, error } = await supabaseAdmin
      .from('run_events')
      .select('*')
      .eq('run_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ events: events || [] });
  } catch (err) {
    logger.error({ err }, 'Failed to get run timeline');
    next(err);
  }
};

export const pauseRun = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason, duration_minutes } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.email || 'Unknown';
    const workspaceId = req.user?.workspace_id;

    const { data: run, error: runError } = await supabaseAdmin
      .from('agent_runs')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (runError || !run) {
      return res.status(404).json({ error: 'Agent run not found' });
    }

    if (!['RUNNING', 'QUEUED', 'SCHEDULED', 'WAITING_HUMAN_REVIEW'].includes(run.status)) {
      return res.status(400).json({ error: 'Cannot pause run in current status' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('agent_runs')
      .update({ 
        status: 'PAUSED',
        severity: 'warning',
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await supabaseAdmin.from('run_events').insert({
      run_id: id,
      event_type: 'run.paused',
      actor_type: 'user',
      actor_id: userId,
      actor_name: userName,
      previous_state: run.status,
      new_state: 'PAUSED',
      reason: reason || 'Manual pause',
    });

    await logToDatabase('info', 'Operations', `Agent run ${id} paused by ${userName}`, { runId: id, reason });

    res.json({ success: true, message: 'Run paused successfully' });
  } catch (err) {
    logger.error({ err }, 'Failed to pause run');
    next(err);
  }
};

export const resumeRun = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.email || 'Unknown';
    const workspaceId = req.user?.workspace_id;

    const { data: run, error: runError } = await supabaseAdmin
      .from('agent_runs')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (runError || !run) {
      return res.status(404).json({ error: 'Agent run not found' });
    }

    if (run.status !== 'PAUSED') {
      return res.status(400).json({ error: 'Can only resume paused runs' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('agent_runs')
      .update({ 
        status: run.previous_status || 'QUEUED',
        severity: 'normal',
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await supabaseAdmin.from('run_events').insert({
      run_id: id,
      event_type: 'run.resumed',
      actor_type: 'user',
      actor_id: userId,
      actor_name: userName,
      previous_state: 'PAUSED',
      new_state: run.previous_status || 'QUEUED',
      reason: reason || 'Manual resume',
    });

    await logToDatabase('info', 'Operations', `Agent run ${id} resumed by ${userName}`, { runId: id });

    res.json({ success: true, message: 'Run resumed successfully' });
  } catch (err) {
    logger.error({ err }, 'Failed to resume run');
    next(err);
  }
};

export const stopRun = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.email || 'Unknown';
    const workspaceId = req.user?.workspace_id;

    const { data: run, error: runError } = await supabaseAdmin
      .from('agent_runs')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (runError || !run) {
      return res.status(404).json({ error: 'Agent run not found' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('agent_runs')
      .update({ 
        status: 'FAILED',
        severity: 'critical',
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await supabaseAdmin.from('run_events').insert({
      run_id: id,
      event_type: 'run.stopped',
      actor_type: 'user',
      actor_id: userId,
      actor_name: userName,
      previous_state: run.status,
      new_state: 'FAILED',
      reason: reason || 'Manual stop',
    });

    await logToDatabase('warn', 'Operations', `Agent run ${id} stopped by ${userName}`, { runId: id, reason });

    res.json({ success: true, message: 'Run stopped successfully' });
  } catch (err) {
    logger.error({ err }, 'Failed to stop run');
    next(err);
  }
};

export const retryRun = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { scope } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.email || 'Unknown';
    const workspaceId = req.user?.workspace_id;

    const { data: originalRun, error: runError } = await supabaseAdmin
      .from('agent_runs')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (runError || !originalRun) {
      return res.status(404).json({ error: 'Agent run not found' });
    }

    if (!['FAILED', 'COMPLETED'].includes(originalRun.status)) {
      return res.status(400).json({ error: 'Can only retry failed or completed runs' });
    }

    const { data: newRun, error: createError } = await supabaseAdmin
      .from('agent_runs')
      .insert({
        workspace_id: workspaceId,
        brand_id: originalRun.brand_id,
        environment: originalRun.environment,
        agent_id: originalRun.agent_id,
        agent_name: originalRun.agent_name,
        agent_type: originalRun.agent_type,
        workflow_id: originalRun.workflow_id,
        workflow_name: originalRun.workflow_name,
        workflow_version: originalRun.workflow_version,
        task_id: originalRun.task_id,
        task_objective: originalRun.task_objective,
        status: 'QUEUED',
        severity: 'normal',
        owner_id: originalRun.owner_id,
        priority: originalRun.priority || 5,
      })
      .select()
      .single();

    if (createError) throw createError;

    await supabaseAdmin.from('run_events').insert({
      run_id: newRun.id,
      event_type: 'run.retry_requested',
      actor_type: 'user',
      actor_id: userId,
      actor_name: userName,
      previous_state: originalRun.status,
      new_state: 'QUEUED',
      reason: `Retry of run ${id}`,
      payload_ref: id,
    });

    await logToDatabase('info', 'Operations', `Agent run ${id} retry created as ${newRun.id}`, { originalRunId: id, newRunId: newRun.id });

    res.json({ success: true, new_run_id: newRun.id, message: 'Retry run created successfully' });
  } catch (err) {
    logger.error({ err }, 'Failed to retry run');
    next(err);
  }
};

export const quarantineRun = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.email || 'Unknown';
    const workspaceId = req.user?.workspace_id;

    const { data: run, error: runError } = await supabaseAdmin
      .from('agent_runs')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (runError || !run) {
      return res.status(404).json({ error: 'Agent run not found' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('agent_runs')
      .update({ 
        status: 'QUARANTINED',
        severity: 'critical',
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await supabaseAdmin.from('run_events').insert({
      run_id: id,
      event_type: 'output.quarantined',
      actor_type: 'user',
      actor_id: userId,
      actor_name: userName,
      previous_state: run.status,
      new_state: 'QUARANTINED',
      reason: reason || 'Safety concern',
    });

    await logToDatabase('warn', 'Operations', `Agent run ${id} quarantined by ${userName}`, { runId: id, reason });

    res.json({ success: true, message: 'Run quarantined successfully' });
  } catch (err) {
    logger.error({ err }, 'Failed to quarantine run');
    next(err);
  }
};

export const listQueues = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const { queue_type, status, owner_id, limit = 50, offset = 0 } = req.query;

    if (!workspaceId) {
      return res.status(403).json({ error: 'Workspace not found' });
    }

    let query = supabaseAdmin
      .from('queue_items')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('priority', { ascending: false })
      .order('due_at', { ascending: true })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (queue_type) query = query.eq('queue_type', queue_type as string);
    if (status) query = query.eq('status', status as string);
    if (owner_id) query = query.eq('assignee_id', owner_id as string);

    const { data: items, error } = await query;

    if (error) throw error;

    res.json({
      items: items || [],
      total: items?.length || 0,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to list queue items');
    next(err);
  }
};

export const assignQueueItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { assignee_id } = req.body;
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;

    const { data: item, error: itemError } = await supabaseAdmin
      .from('queue_items')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ error: 'Queue item not found' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('queue_items')
      .update({ 
        assignee_id,
        claimed_by: userId,
        claimed_at: new Date().toISOString(),
        status: 'IN_PROGRESS',
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Queue item assigned successfully' });
  } catch (err) {
    logger.error({ err }, 'Failed to assign queue item');
    next(err);
  }
};

export const createIncident = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { run_id, severity, category, root_cause, due_at } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.email || 'Unknown';
    const workspaceId = req.user?.workspace_id;

    if (!workspaceId) {
      return res.status(403).json({ error: 'Workspace not found' });
    }

    let runName = 'System';
    if (run_id) {
      const { data: run } = await supabaseAdmin
        .from('agent_runs')
        .select('task_objective')
        .eq('id', run_id)
        .single();
      runName = run?.task_objective || 'Unknown Task';
    }

    const { data: incident, error } = await supabaseAdmin
      .from('incidents')
      .insert({
        workspace_id: workspaceId,
        run_id: run_id || null,
        severity,
        category,
        owner_id: userId,
        status: 'OPEN',
        created_by: userId,
        root_cause: root_cause || null,
        due_at: due_at || null,
      })
      .select()
      .single();

    if (error) throw error;

    await logToDatabase('warn', 'Operations', `Incident ${incident.id} created by ${userName}`, { 
      incidentId: incident.id, 
      runId: run_id, 
      severity, 
      category 
    });

    res.json({ 
      success: true, 
      incident: {
        ...incident,
        run_name: runName,
        created_by_name: userName,
      }
    });
  } catch (err) {
    logger.error({ err }, 'Failed to create incident');
    next(err);
  }
};

export const listIncidents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const workspaceId = req.user?.workspace_id;
    const { severity, status, owner_id, limit = 50, offset = 0 } = req.query;

    if (!workspaceId) {
      return res.status(403).json({ error: 'Workspace not found' });
    }

    let query = supabaseAdmin
      .from('incidents')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (severity) query = query.eq('severity', severity as string);
    if (status) query = query.eq('status', status as string);
    if (owner_id) query = query.eq('owner_id', owner_id as string);

    const { data: incidents, error } = await query;

    if (error) throw error;

    const incidentsWithRuns = await Promise.all((incidents || []).asyncMap(async (inc: Incident) => {
      if (inc.run_id) {
        const { data: run } = await supabaseAdmin
          .from('agent_runs')
          .select('task_objective')
          .eq('id', inc.run_id)
          .single();
        return { ...inc, run_name: run?.task_objective || 'Unknown' };
      }
      return { ...inc, run_name: 'System' };
    }));

    res.json({ incidents: incidentsWithRuns });
  } catch (err) {
    logger.error({ err }, 'Failed to list incidents');
    next(err);
  }
};

export const resolveIncident = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { resolution, remediation } = req.body;
    const userId = req.user?.id;
    const workspaceId = req.user?.workspace_id;

    const { data: incident, error: incidentError } = await supabaseAdmin
      .from('incidents')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (incidentError || !incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('incidents')
      .update({
        status: 'RESOLVED',
        closed_by: userId,
        closed_at: new Date().toISOString(),
        remediation: remediation || null,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Incident resolved' });
  } catch (err) {
    logger.error({ err }, 'Failed to resolve incident');
    next(err);
  }
};

export const getOperationsStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const workspaceId = req.user?.workspace_id;

    if (!workspaceId) {
      return res.status(403).json({ error: 'Workspace not found' });
    }

    const [
      { count: activeRuns },
      { count: queuedItems },
      { count: failedRuns },
      { count: openIncidents },
      { count: policyBlocks },
    ] = await Promise.all([
      supabaseAdmin.from('agent_runs').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'RUNNING'),
      supabaseAdmin.from('queue_items').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'PENDING'),
      supabaseAdmin.from('agent_runs').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'FAILED'),
      supabaseAdmin.from('incidents').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'OPEN'),
      supabaseAdmin.from('agent_runs').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'POLICY_BLOCKED'),
    ]);

    const { data: avgTrust } = await supabaseAdmin
      .from('agents')
      .select('trust_score')
      .eq('workspace_id', workspaceId);

    const trustAvg = avgTrust?.length 
      ? Math.round(avgTrust.reduce((sum, a) => sum + (a.trust_score || 0), 0) / avgTrust.length * 100) 
      : 0;

    res.json({
      active_runs: activeRuns || 0,
      queued_tasks: queuedItems || 0,
      failed_runs: failedRuns || 0,
      open_incidents: openIncidents || 0,
      policy_blocks: policyBlocks || 0,
      avg_trust_score: trustAvg,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get operations stats');
    next(err);
  }
};

export const getRunEvidence = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bundleId } = req.params;
    const workspaceId = req.user?.workspace_id;

    const { data: evidence, error } = await supabaseAdmin
      .from('evidence_bundles')
      .select('*')
      .eq('id', bundleId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !evidence) {
      return res.status(404).json({ error: 'Evidence bundle not found' });
    }

    res.json({ evidence });
  } catch (err) {
    logger.error({ err }, 'Failed to get run evidence');
    next(err);
  }
};

export const exportEvidence = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bundleId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.email || 'Unknown';
    const workspaceId = req.user?.workspace_id;

    const { data: evidence, error } = await supabaseAdmin
      .from('evidence_bundles')
      .select('*')
      .eq('id', bundleId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !evidence) {
      return res.status(404).json({ error: 'Evidence bundle not found' });
    }

    await supabaseAdmin
      .from('evidence_bundles')
      .update({
        exported_by: userId,
        exported_at: new Date().toISOString(),
        export_reason: reason || 'Manual export',
      })
      .eq('id', bundleId);

    await logToDatabase('info', 'Operations', `Evidence bundle ${bundleId} exported by ${userName}`, { bundleId, reason });

    res.json({ success: true, message: 'Evidence exported successfully', download_url: evidence.storage_ref });
  } catch (err) {
    logger.error({ err }, 'Failed to export evidence');
    next(err);
  }
};