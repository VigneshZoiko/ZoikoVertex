import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { AuthRequest } from '../../shared/authMiddleware';

/**
 * Lists media from the library with search and filtering
 */
export const listLibrary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search, type } = req.query;
    const userId = req.user?.id;
    const isSuper = req.user?.is_superadmin;
    const workspaceId = req.user?.workspace_id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!workspaceId && !isSuper) return res.status(403).json({ error: 'Workspace context missing' });

    // Step 1: Fetch library items scoped to workspace
    let query = supabaseAdmin
      .from('media_library')
      .select('id, title, url, urls, file_type, uploader_id, status, created_at, workspace_id')
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (!isSuper) {
      query = query.eq('workspace_id', workspaceId);
    }

    if (type && type !== 'all') {
      // Support both exact match ("image") and MIME type ("image/jpeg", "image/png")
      query = query.ilike('file_type', `${type}%`);
    }

    const { data: items, error } = await query;
    if (error) throw error;
    if (!items || items.length === 0) return res.status(200).json([]);

    // Step 2: Fetch uploader details for all unique uploader IDs
    const uploaderIds = [...new Set(items.map((i) => i.uploader_id).filter(Boolean))];
    const { data: uploaders } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email')
      .in('id', uploaderIds);

    const uploaderMap: Record<string, { id: string; full_name: string; email: string }> = {};
    (uploaders || []).forEach((u) => { uploaderMap[u.id] = u; });

    // Step 3: Merge and apply search filter
    let result = items.map((item) => ({
      ...item,
      urls: item.urls || [item.url],
      uploader: uploaderMap[item.uploader_id] || null,
    }));

    // Search by title OR uploader name
    if (search) {
      const q = (search as string).toLowerCase();
      result = result.filter((item) =>
        item.title?.toLowerCase().includes(q) ||
        item.uploader?.full_name?.toLowerCase().includes(q) ||
        item.uploader?.email?.toLowerCase().includes(q)
      );
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Registers a new asset in the library
 */
export const addToLibrary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, urls, file_type } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!title || !urls || !urls.length || !file_type) {
      return res.status(400).json({ error: 'Missing required fields: title, urls, file_type' });
    }

    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace context missing' });

    const { data, error } = await supabaseAdmin
      .from('media_library')
      .insert({
        title,
        urls,
        url: urls[0],
        file_type,
        uploader_id: userId,
        workspace_id: workspaceId,
        status: 'available'
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`[Library] New asset added: ${title} by ${userId}`);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes an asset from the library
 */
export const deleteFromLibrary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Ensure the user is the uploader OR an admin
    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('role, workspace_id')
      .eq('user_id', userId)
      .single();

    const isAdmin = member?.role === 'ADMIN' || member?.role === 'MANAGER';
    const isSuper = (await supabaseAdmin.from('users').select('is_superadmin').eq('id', userId).single()).data?.is_superadmin;

    let query = supabaseAdmin
      .from('media_library')
      .delete()
      .eq('id', id);

    if (!isSuper) {
      // If not superadmin, must be uploader OR workspace admin in the correct workspace
      query = query.eq('workspace_id', member?.workspace_id);
      if (!isAdmin) {
        query = query.eq('uploader_id', userId);
      }
    }

    const { error } = await query;

    if (error) throw error;

    res.status(200).json({ success: true, message: 'Asset removed from library' });
  } catch (error) {
    next(error);
  }
};
