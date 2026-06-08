import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

function buildOrConditions(words: string[], fields: string[]): string {
  const conds = words.flatMap(w => fields.map(f => `${f}.ilike.%${w}%`));
  return conds.join(',');
}

export const performGlobalSearch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    const words = q.trim().split(/\s+/).filter(Boolean);

    const scopeFilter = <T extends { eq: (field: string, val: string) => T }>(query: T, field = 'workspace_id'): T =>
      !isSuperAdmin && workspaceId ? query.eq(field, workspaceId) : query;

    const agentFields = ['name', 'description', 'type'];
    const campaignFields = ['title', 'description'];
    const workflowFields = ['name', 'description'];
    const policyFields = ['name', 'description'];
    const intentFields = ['content', 'platform'];

    const [agentsResult, intentsResult, campaignsResult, workflowsResult, policiesResult] =
      await Promise.allSettled([
        scopeFilter(
          supabaseAdmin
            .from('agents')
            .select('id, name, status, autonomy_level, workspace_id')
            .or(buildOrConditions(words, agentFields))
        ).limit(5),
        scopeFilter(
          supabaseAdmin
            .from('publish_intents')
            .select('id, content, platform, status, workspace_id')
            .or(buildOrConditions(words, intentFields))
        ).limit(10),
        scopeFilter(
          supabaseAdmin
            .from('campaigns')
            .select('id, title, status, workspace_id')
            .or(buildOrConditions(words, campaignFields))
        ).limit(5),
        scopeFilter(
          supabaseAdmin
            .from('workflow_templates')
            .select('id, name, status, risk_level, workspace_id')
            .or(buildOrConditions(words, workflowFields))
        ).limit(5),
        scopeFilter(
          supabaseAdmin
            .from('policies')
            .select('id, name, status, risk_level, workspace_id')
            .or(buildOrConditions(words, policyFields))
        ).limit(5),
      ]);

    const extract = <T>(result: PromiseSettledResult<{ data: T[] | null }>, fallback: T[] = []): T[] =>
      result.status === 'fulfilled' ? (result.value.data ?? fallback) : fallback;

    res.json({
      success: true,
      words,
      data: {
        agents: extract(agentsResult),
        content: extract(intentsResult),
        campaigns: extract(campaignsResult),
        workflows: extract(workflowsResult),
        policies: extract(policiesResult),
      },
    });
  } catch (error) {
    next(error);
  }
};
