import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { AuthRequest } from '../../shared/authMiddleware';
import { moderate } from '../../modules/safety/moderationService';
import { scanImage, type KeywordRule } from '../../modules/safety/imageScanner';
import { v4 as uuidv4 } from 'uuid';

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
      })
      .select()
      .single();

    if (error) throw error;

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

      // Create a Review Queue item
      await supabaseAdmin
        .from('review_items')
        .insert({
          id: uuidv4(),
          tenant_id: workspaceId,
          workspace_id: workspaceId,
          item_type: 'campaign_asset',
          source_module: 'media_library',
          source_entity_id: mediaId,
          title: scan.isVideo ? `[VIDEO REVIEW] ${title}` : `[BLOCKED] ${title}`,
          content_snapshot: {
            copy: title,
            urls,
            file_type,
            violation_reason: scan.reason,
            scan_notes: scan.imageScanNotes,
          },
          submitted_by: userId,
          priority: 'HIGH',
          risk_level: 'HIGH',
          risk_category: scan.isVideo ? 'video_content' : 'content_safety',
          status: 'PENDING_REVIEW',
          validation_status: 'FAILED',
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
