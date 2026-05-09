import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

/**
 * Lists media from the library with search and filtering
 */
export const listLibrary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, type } = req.query;

    // Step 1: Fetch library items
    let query = supabaseAdmin
      .from('media_library')
      .select('id, title, url, urls, file_type, uploader_id, status, created_at')
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (type && type !== 'all') {
      query = query.eq('file_type', type);
    }

    const { data: items, error } = await query;
    if (error) throw error;
    if (!items || items.length === 0) return res.status(200).json([]);

    // Step 2: Fetch uploader details for all unique uploader IDs
    const uploaderIds = [...new Set(items.map((i: any) => i.uploader_id).filter(Boolean))];
    const { data: uploaders } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email')
      .in('id', uploaderIds);

    const uploaderMap: Record<string, { full_name: string; email: string }> = {};
    (uploaders || []).forEach((u: any) => { uploaderMap[u.id] = u; });

    // Step 3: Merge and apply search filter
    let result = items.map((item: any) => ({
      ...item,
      urls: item.urls || [item.url],
      uploader: uploaderMap[item.uploader_id] || null,
    }));

    // Search by title OR uploader name
    if (search) {
      const q = (search as string).toLowerCase();
      result = result.filter((item: any) =>
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
export const addToLibrary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, urls, file_type, uploader_id } = req.body;

    if (!title || !urls || !urls.length || !file_type || !uploader_id) {
      return res.status(400).json({ error: 'Missing required fields: title, urls, file_type, uploader_id' });
    }

    const { data, error } = await supabaseAdmin
      .from('media_library')
      .insert({
        title,
        urls,
        url: urls[0], // Keep first for backward compatibility
        file_type,
        uploader_id,
        status: 'available'
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`[Library] New asset added: ${title} by ${uploader_id}`);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes an asset from the library
 */
export const deleteFromLibrary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('media_library')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ success: true, message: 'Asset removed from library' });
  } catch (error) {
    next(error);
  }
};
