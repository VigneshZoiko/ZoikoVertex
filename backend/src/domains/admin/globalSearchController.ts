import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

/**
 * Global Search: High-speed discovery across the entire intelligence network
 */
export const performGlobalSearch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const isSuperAdmin = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    const searchTerm = `%${q}%`;

    // 1. Search Agents
    let agentQuery = supabaseAdmin
      .from('agents')
      .select('id, name, status, autonomy_level, workspace_id')
      .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`);
    
    if (!isSuperAdmin && workspaceId) agentQuery = agentQuery.eq('workspace_id', workspaceId);
    const { data: agents } = await agentQuery.limit(5);

    // 2. Search Content (Intents)
    let intentQuery = supabaseAdmin
      .from('publish_intents')
      .select('id, content, platform, status, workspace_id')
      .ilike('content', searchTerm);
    
    if (!isSuperAdmin && workspaceId) intentQuery = intentQuery.eq('workspace_id', workspaceId);
    const { data: intents } = await intentQuery.limit(10);

    // 3. Search Campaigns
    let campaignQuery = supabaseAdmin
      .from('campaigns')
      .select('id, title, status, workspace_id')
      .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`);
    
    if (!isSuperAdmin && workspaceId) campaignQuery = campaignQuery.eq('workspace_id', workspaceId);
    const { data: campaigns } = await campaignQuery.limit(5);

    res.json({
      success: true,
      data: {
        agents: agents || [],
        content: intents || [],
        campaigns: campaigns || []
      }
    });
  } catch (error) {
    next(error);
  }
};
