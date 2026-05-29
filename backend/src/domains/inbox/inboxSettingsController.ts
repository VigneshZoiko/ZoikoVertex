import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { supabaseAdmin } from '../../shared/supabase';

export const listAutoReplyRules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user!.workspace_id as string;
    const { data, error } = await supabaseAdmin
      .from('inbox_auto_reply_rules')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data: data || [] });
  } catch (e) { next(e); }
};

export const createAutoReplyRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const workspaceId = req.user!.workspace_id as string;
    const { rule_name, keywords, reply_body, is_active, is_case_sensitive } = req.body as {
      rule_name?: string; keywords?: string[]; reply_body?: string; is_active?: boolean; is_case_sensitive?: boolean;
    };
    if (!keywords?.length || !reply_body?.trim()) {
      return res.status(400).json({ error: 'keywords (array) and reply_body are required' });
    }
    const { data, error } = await supabaseAdmin
      .from('inbox_auto_reply_rules')
      .insert({
        workspace_id: workspaceId,
        rule_name: rule_name?.trim() || 'Untitled Rule',
        keywords: keywords.map(k => k.trim()).filter(Boolean),
        reply_body: reply_body.trim(),
        is_active: is_active ?? true,
        is_case_sensitive: is_case_sensitive ?? false,
        created_by: userId,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data });
  } catch (e) { next(e); }
};

export const updateAutoReplyRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user!.workspace_id as string;
    const { id } = req.params;
    const { rule_name, keywords, reply_body, is_active, is_case_sensitive } = req.body as {
      rule_name?: string; keywords?: string[]; reply_body?: string; is_active?: boolean; is_case_sensitive?: boolean;
    };
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (rule_name !== undefined) update.rule_name = rule_name.trim();
    if (keywords !== undefined) update.keywords = keywords.map(k => k.trim()).filter(Boolean);
    if (reply_body !== undefined) update.reply_body = reply_body.trim();
    if (is_active !== undefined) update.is_active = is_active;
    if (is_case_sensitive !== undefined) update.is_case_sensitive = is_case_sensitive;
    const { data, error } = await supabaseAdmin
      .from('inbox_auto_reply_rules')
      .update(update)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data });
  } catch (e) { next(e); }
};

export const deleteAutoReplyRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.user!.workspace_id as string;
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('inbox_auto_reply_rules')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (e) { next(e); }
};
