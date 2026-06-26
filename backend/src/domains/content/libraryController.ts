import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { AuthRequest } from '../../shared/authMiddleware';
import { moderate } from '../../modules/safety/moderationService';
import { scanImage, type KeywordRule } from '../../modules/safety/imageScanner';
import { v4 as uuidv4 } from 'uuid';
import { trackUsage } from '../monitoring/usageController';
import { createAuditEvent } from '../../services/auditTrail.service';
import { createApprovalItem } from '../../services/approval.service';

/**
 * Extracts the storage object path from a Supabase Storage public URL.
 * URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
function extractStoragePath(url: string, bucket: string = 'media'): string | null {
  try {
    const parsed = new URL(url);
    const prefix = `/storage/v1/object/public/${bucket}/`;
    const idx = parsed.pathname.indexOf(prefix);
    if (idx === -1) return null;
    return parsed.pathname.slice(idx + prefix.length);
  } catch {
    return null;
  }
}

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

interface ScanResult {
  safe: boolean;
  isVideo: boolean;
  reason?: string;
  violations?: string[];
  // per-image scan details for the audit note
  imageScanNotes: string[];
}

async function scanMediaUpload(
  title: string,
  urls: string[],
  file_type: string,
  workspaceId: string,
  mediaId: string,
): Promise<ScanResult> {
  const imageScanNotes: string[] = [];

  // ── Video: always route to human reviewer, never auto-block ──────────────
  if (file_type.startsWith('video/') || file_type === 'video' || file_type === 'mixed') {
    logger.info({ title, file_type }, '[LibraryScan] Video upload — routing to reviewer');
    return {
      safe: false,
      isVideo: true,
      reason: 'Video content requires human review before publishing.',
      violations: ['video_review_required'],
      imageScanNotes: ['[VIDEO] Routed directly to Review Queue — video content is not auto-scanned.'],
    };
  }

  // ── Load keyword rules ────────────────────────────────────────────────────
  const { data: activeRules } = await supabaseAdmin
    .from('approval_rules')
    .select('id, rule_name, rule_status, keyword_rules')
    .eq('workspace_id', workspaceId)
    .in('rule_status', ['ACTIVE', 'ACTIVE_WITH_DRAFT_CHANGES', 'DRAFT']);

  const keywordRules: KeywordRule[] = [];
  for (const rule of (activeRules || [])) {
    const krs = rule.keyword_rules;
    if (!Array.isArray(krs)) continue;
    for (const kr of krs) {
      if (Array.isArray(kr.keywords) && kr.keywords.length > 0 && kr.action) {
        keywordRules.push({ id: rule.id, keywords: kr.keywords, action: kr.action });
      }
    }
  }

  // ── Title keyword check (fast path) ──────────────────────────────────────
  const lowerTitle = title.toLowerCase();
  for (const kr of keywordRules) {
    for (const kw of kr.keywords) {
      const lowerKw = kw.toLowerCase().trim();
      if (lowerKw && lowerTitle.includes(lowerKw)) {
        return {
          safe: false,
          isVideo: false,
          reason: `Title contains ${kr.action === 'BLOCK' ? 'blocked' : 'review-required'} keyword: "${kw}"`,
          violations: ['blocked_word'],
          imageScanNotes: [`[TITLE] Keyword match: "${kw}" (action: ${kr.action})`],
        };
      }
    }
  }

  // ── Text moderation on title ──────────────────────────────────────────────
  const modResult = await moderate({ content: title, tenantId: workspaceId, workspaceId });
  const textViolations: string[] = [];
  const scores = modResult.categoryScores as Record<string, number>;
  for (const cat of ['offensive_language', 'sexual_content', 'violence', 'self_harm', 'hate_speech']) {
    if ((scores[cat] || 0) > 0.6) textViolations.push(cat);
  }
  if (textViolations.length > 0) {
    return {
      safe: false,
      isVideo: false,
      reason: `Title failed safety check: ${textViolations.join(', ')}`,
      violations: textViolations,
      imageScanNotes: [`[TITLE] Safety categories triggered: ${textViolations.join(', ')}`],
    };
  }

  // ── Image scan — ALL urls ─────────────────────────────────────────────────
  if ((file_type.startsWith('image/') || file_type === 'image') && urls.length > 0) {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const label = urls.length > 1 ? `Image ${i + 1}/${urls.length}` : 'Image';
      logger.info({ url: url.slice(0, 80), label }, '[LibraryScan] Starting image scan');

      try {
        const imgResult = await scanImage(url, keywordRules, mediaId, workspaceId);

        if (imgResult.skipped) {
          imageScanNotes.push(`[${label}] Scan skipped (Gemini unavailable or fetch failed). URL: ${url.slice(0, 80)}`);
          continue;
        }

        // Build readable note for this image
        const textPreview = imgResult.extractedText
          ? `Extracted text: "${imgResult.extractedText.slice(0, 300)}"`
          : 'No text extracted from image.';
        const catSummary = Object.entries(imgResult.sensitiveCategories)
          .map(([k, v]) => `${k}=${(v as number * 100).toFixed(0)}%`)
          .join(', ') || 'none';
        const violSummary = imgResult.violations.length > 0
          ? imgResult.violations.map(v => `${v.action}:${v.category}(${v.matchedKeyword || v.description.slice(0, 50)})`).join('; ')
          : 'none';

        imageScanNotes.push(
          `[${label}] Model: ${imgResult.modelUsed || 'unknown'} | ${imgResult.durationMs}ms\n` +
          `  ${textPreview}\n` +
          `  Sensitive: ${catSummary}\n` +
          `  Violations: ${violSummary}`
        );

        // Check for blocking violations
        for (const v of imgResult.violations) {
          if (v.action === 'BLOCK') {
            return {
              safe: false,
              isVideo: false,
              reason: `${label}: ${v.description}`,
              violations: [v.category],
              imageScanNotes,
            };
          }
          if (v.action === 'REQUEST_REVIEW') {
            return {
              safe: false,
              isVideo: false,
              reason: `${label} requires review: ${v.description}`,
              violations: [v.category],
              imageScanNotes,
            };
          }
        }
      } catch (err) {
        logger.error({ err, url }, '[LibraryScan] scanImage threw unexpectedly');
        imageScanNotes.push(`[${label}] Scan error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return { safe: true, isVideo: false, imageScanNotes };
}

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

    const mediaId = uuidv4();

    // Run the safety scan (pass mediaId so logs are linked)
    const scan = await scanMediaUpload(title, urls, file_type, workspaceId, mediaId);

    // Determine library status
    const libraryStatus = scan.safe ? 'available' : (scan.isVideo ? 'pending_review' : 'blocked');

    const { file_size_bytes } = req.body;

    const { data: mediaAsset, error } = await supabaseAdmin
      .from('media_library')
      .insert({
        id: mediaId,
        title,
        urls,
        url: urls[0],
        file_type,
        uploader_id: userId,
        workspace_id: workspaceId,
        status: libraryStatus,
        ...(file_size_bytes != null ? { file_size_bytes } : {}),
      })
      .select()
      .single();

    if (error) throw error;

    // Track storage usage — use real size when available, fall back to rough estimate
    if (mediaAsset && workspaceId) {
      const actualMb = file_size_bytes ? file_size_bytes / (1024 * 1024) : urls.length * 0.5;
      trackUsage({ workspaceId, resourceType: 'STORAGE_MB', quantity: actualMb, costUsd: 0, unit: 'MB', referenceId: mediaId, referenceType: 'media_upload', metadata: { file_type, url_count: urls.length } });
    }

    // Determine validation status
    const validationStatus = scan.safe
      ? 'PASSED'
      : scan.isVideo
        ? 'MANUAL_CHECK_REQUIRED'
        : 'MANUAL_CHECK_REQUIRED';

    // Create a validation item in Validation Desk
    const validationItemId = uuidv4();
    await supabaseAdmin
      .from('validation_items')
      .insert({
        id: validationItemId,
        tenant_id: workspaceId,
        workspace_id: workspaceId,
        source_module: 'media_library',
        source_entity_id: mediaId,
        item_type: 'campaign_asset',
        title: title,
        content_snapshot: { copy: title, urls, file_type },
        validation_status: validationStatus,
        risk_level: scan.safe ? 'LOW' : 'HIGH',
        submitted_by: userId,
        due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });

    // Always write a scan note so the Validation Desk shows what Gemini found
    const scanNoteBody = scan.imageScanNotes.length > 0
      ? `🤖 Automated Scan Report:\n\n${scan.imageScanNotes.join('\n\n')}`
      : '🤖 Automated Scan: No images scanned (title-only check passed).';

    try {
      await supabaseAdmin
        .from('validation_notes')
        .insert({ id: uuidv4(), validation_item_id: validationItemId, note_body: scanNoteBody, created_by: 'system' });
    } catch { /* non-blocking */ }

    // If not safe — create run result + review queue item + notify creator
    if (!scan.safe) {
      const runId = uuidv4();
      await supabaseAdmin
        .from('validation_runs')
        .insert({
          id: runId,
          validation_item_id: validationItemId,
          run_by: 'system',
          run_status: 'COMPLETED',
          result_summary: scan.isVideo ? 'Video routed to human reviewer' : 'Blocked on upload safety scan',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });

      await supabaseAdmin
        .from('validation_rule_results')
        .insert({
          id: uuidv4(),
          validation_run_id: runId,
          rule_name: scan.isVideo ? 'Video Review Policy' : 'Automated Media Safety Scan',
          rule_category: 'policy_rules',
          result: scan.isVideo ? 'FAILED' : 'BLOCKED',
          severity: 'HIGH',
          explanation: scan.reason || 'Content requires review.',
          override_eligible: scan.isVideo,
          manual_check_required: true,
        });

      // Route to Approval Console
      await createApprovalItem({
        tenant_id: workspaceId,
        workspace_id: workspaceId,
        item_type: 'CONTENT_APPROVAL',
        source_module: 'media_library',
        source_entity_id: mediaId,
        title: scan.isVideo ? `[VIDEO REVIEW] ${title}` : `[BLOCKED] ${title}`,
        submitted_by: userId,
        risk_level: 'HIGH',
      });

      // Notify creator
      await supabaseAdmin
        .from('notifications')
        .insert({
          id: uuidv4(),
          user_id: userId,
          title: scan.isVideo ? '📹 Video Sent for Review' : '⚠️ Media Blocked — Sent for Review',
          body: scan.isVideo
            ? `Your video "${title}" has been sent to the Review Queue. A reviewer will approve or reject it before it can be published.`
            : `Your media "${title}" was flagged: ${scan.reason}. It has been sent to the Review Queue.`,
          type: 'GOVERNANCE',
          link: '/queue',
          read: false,
        });

      // Emit audit event so Evidence Intelligence Worker can auto-create a forensic case
      try {
        await createAuditEvent({
          workspace_id: workspaceId,
          tenant_id: workspaceId,
          event_category: 'content_lifecycle',
          event_type: scan.isVideo ? 'media.video_pending_review' : 'media.safety_violation',
          event_title: scan.isVideo
            ? `Video Upload Pending Review: ${title}`
            : `Media Safety Violation: ${title}`,
          event_summary: scan.reason || 'Content flagged by automated safety scanner and routed to review queue.',
          actor: { actor_id: userId, actor_type: 'human' },
          object: { object_type: 'media_asset', object_id: mediaId },
          risk_level: scan.isVideo ? 'medium' : 'high',
          status: scan.isVideo ? 'pending' : 'blocked',
          evidence_state: 'not_preserved',
          retention_class: 'STANDARD',
        } as any);
      } catch { /* non-blocking — review queue item already created */ }
    }

    logger.info({
      title,
      userId,
      mediaId,
      status: libraryStatus,
      isVideo: scan.isVideo,
      safe: scan.safe,
      reason: scan.reason,
    }, '[Library] Asset processed');

    res.status(201).json(mediaAsset);
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes an asset from the library and its files from storage permanently.
 */
export const deleteFromLibrary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const role        = req.user?.role;
    const isSuper     = req.user?.is_superadmin;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!workspaceId && !isSuper) return res.status(403).json({ error: 'Workspace context missing' });

    const isAdmin = ['ADMIN', 'MANAGER', 'WORKSPACE_OWNER'].includes(role ?? '');

    // Fetch item to get storage paths before deleting
    let fetchQuery = supabaseAdmin
      .from('media_library')
      .select('url, urls')
      .eq('id', id);

    if (!isSuper) {
      fetchQuery = fetchQuery.eq('workspace_id', workspaceId);
    }

    const { data: item } = await fetchQuery.single();
    if (item) {
      const paths = [item.url, ...(item.urls || [])]
        .filter(Boolean)
        .map((u: string) => extractStoragePath(u))
        .filter(Boolean) as string[];
      if (paths.length > 0) {
        await supabaseAdmin.storage.from('media').remove(paths);
      }
    }

    let query = supabaseAdmin
      .from('media_library')
      .delete()
      .eq('id', id);

    if (!isSuper) {
      query = query.eq('workspace_id', workspaceId);
      if (!isAdmin) {
        query = query.eq('uploader_id', userId);
      }
    }

    const { error } = await query;
    if (error) throw error;

    // Clean up resource_usage so the Storage meter reflects the deletion (fire-and-forget)
    supabaseAdmin.from('resource_usage')
      .delete()
      .eq('workspace_id', workspaceId ?? '')
      .eq('resource_type', 'STORAGE_MB')
      .contains('metadata', { reference_id: id })
      .then(undefined, () => {});

    res.status(200).json({ success: true, message: 'Asset removed from library' });
  } catch (error) {
    next(error);
  }
};

/**
 * Lists ALL media items for the workspace — used by Manage Storage.
 * No status filter: shows available, pending_review, and blocked items.
 * Never crosses workspace boundaries.
 * Lazy-backfills file_size_bytes from Supabase Storage for items that don't have it yet.
 */
export const listStorageItems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    if (!userId)      return res.status(401).json({ error: 'Unauthorized' });
    if (!workspaceId) return res.status(403).json({ error: 'Workspace context missing' });

    const { search, type } = req.query;

    let query = supabaseAdmin
      .from('media_library')
      .select('id, title, url, urls, file_type, uploader_id, status, created_at, workspace_id, file_size_bytes')
      .eq('workspace_id', workspaceId)   // always workspace-scoped, no cross-workspace leakage
      .order('created_at', { ascending: false });  // no status filter — show all for management

    if (type && type !== 'all') {
      query = query.ilike('file_type', `${type}%`);
    }

    const { data: items, error } = await query;
    if (error) throw error;
    if (!items || items.length === 0) return res.status(200).json({ success: true, data: [] });

    const uploaderIds = [...new Set(items.map((i: any) => i.uploader_id).filter(Boolean))];
    const { data: uploaders } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email')
      .in('id', uploaderIds);

    const uploaderMap: Record<string, { id: string; full_name: string; email: string }> = {};
    ((uploaders as any[]) || []).forEach((u: any) => { uploaderMap[u.id] = u; });

    const result = (items as any[]).map((item: any) => ({
      id:              item.id,
      title:           item.title,
      url:             item.url,
      urls:            item.urls || [item.url],
      file_type:       item.file_type,
      status:          item.status,
      created_at:      item.created_at,
      file_size_bytes: item.file_size_bytes as number | null,
      uploader:        uploaderMap[item.uploader_id] || null,
    }));

    // Lazy-backfill: for items with no stored size, fetch from Supabase Storage metadata.
    // Updates the response in-place AND saves to DB so subsequent requests skip this step.
    const noSize = result.filter(r => r.file_size_bytes == null && r.url);
    if (noSize.length > 0) {
      const dbUpdates: { id: string; size: number }[] = [];

      await Promise.all(noSize.map(async (item) => {
        const storagePath = extractStoragePath(item.url);
        if (!storagePath) return;

        const lastSlash = storagePath.lastIndexOf('/');
        const folder    = lastSlash >= 0 ? storagePath.slice(0, lastSlash) : '';
        const filename  = lastSlash >= 0 ? storagePath.slice(lastSlash + 1) : storagePath;

        try {
          const { data: files } = await supabaseAdmin.storage
            .from('media')
            .list(folder, { search: filename, limit: 1 });

          const meta = (files as any[])?.[0]?.metadata;
          const size: number | undefined = meta?.size ?? meta?.contentLength;
          if (size && size > 0) {
            item.file_size_bytes = size;
            dbUpdates.push({ id: item.id, size });
          }
        } catch {
          // ignore — storage fetch failure is non-fatal
        }
      }));

      // Fire-and-forget DB update so the next request reads sizes from the DB directly
      for (const { id, size } of dbUpdates) {
        supabaseAdmin.from('media_library')
          .update({ file_size_bytes: size })
          .eq('id', id)
          .then(undefined, () => {});
      }
    }

    let filtered = result;
    if (search) {
      const q = (search as string).toLowerCase();
      filtered = result.filter((item) =>
        item.title?.toLowerCase().includes(q) ||
        item.uploader?.full_name?.toLowerCase().includes(q) ||
        item.uploader?.email?.toLowerCase().includes(q),
      );
    }

    res.status(200).json({ success: true, data: filtered, total: filtered.length });
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteFromLibrary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId      = req.user?.id;
    const workspaceId = req.user?.workspace_id;
    const role        = req.user?.role;
    const isSuper     = req.user?.is_superadmin;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!workspaceId && !isSuper) return res.status(403).json({ error: 'Workspace context missing' });

    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ids array is required' });
    }
    if (ids.length > 500) {
      return res.status(400).json({ success: false, error: 'Cannot delete more than 500 items at once' });
    }

    const isAdmin = ['ADMIN', 'MANAGER', 'WORKSPACE_OWNER'].includes(role ?? '');

    // Fetch items to get storage paths before deleting
    let fetchQuery = supabaseAdmin
      .from('media_library')
      .select('id, url, urls')
      .in('id', ids);

    if (!isSuper) {
      fetchQuery = fetchQuery.eq('workspace_id', workspaceId);
      if (!isAdmin) {
        fetchQuery = fetchQuery.eq('uploader_id', userId);
      }
    }

    const { data: items } = await fetchQuery;

    // Delete files from Supabase Storage first
    if (items?.length) {
      const paths: string[] = [];
      for (const item of items) {
        const urlsToCheck = [item.url, ...(item.urls || [])].filter(Boolean);
        for (const url of urlsToCheck) {
          const p = extractStoragePath(url);
          if (p) paths.push(p);
        }
      }
      if (paths.length > 0) {
        const { error: storageErr } = await supabaseAdmin.storage.from('media').remove(paths);
        if (storageErr) {
          logger.warn({ storageErr, paths }, '[Library] Failed to remove some storage files');
        }
      }
    }

    let delQuery = supabaseAdmin
      .from('media_library')
      .delete()
      .in('id', ids);

    if (!isSuper) {
      delQuery = delQuery.eq('workspace_id', workspaceId);
      if (!isAdmin) {
        delQuery = delQuery.eq('uploader_id', userId);
      }
    }

    // .select() forces PostgREST to return deleted rows so we can verify the actual count.
    const { data: deleted, error } = await (delQuery as any).select('id');
    if (error) throw error;

    const actualCount = (deleted as any[])?.length ?? 0;
    if (actualCount === 0) {
      logger.warn({ userId, workspaceId, requestedIds: ids }, '[Library] Bulk delete matched 0 rows');
      return res.status(404).json({ success: false, error: 'No items were deleted. They may already be deleted or not belong to your workspace.' });
    }

    logger.info({ userId, workspaceId, count: actualCount }, '[Library] Bulk delete');

    // Clean up resource_usage entries for each deleted item so storage meter resets (fire-and-forget)
    const deletedIds = (deleted as any[]).map((r: any) => r.id);
    for (const mediaId of deletedIds) {
      supabaseAdmin.from('resource_usage')
        .delete()
        .eq('workspace_id', workspaceId ?? '')
        .eq('resource_type', 'STORAGE_MB')
        .contains('metadata', { reference_id: mediaId })
        .then(undefined, () => {});
    }

    res.status(200).json({ success: true, deleted: actualCount });
  } catch (error) {
    next(error);
  }
};
