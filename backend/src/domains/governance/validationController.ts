import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import * as validationService from '../../services/validationDesk.service';
import { createReviewItem } from '../../services/reviewQueue.service';
import { createApprovalItem } from '../../services/approval.service';
import { DEFAULT_TENANT_ID } from '../../shared/constants';
import { buildAuthContext } from '../../shared/serviceAuth';
import { moderate } from '../../modules/safety/moderationService';
import { scanImage, type KeywordRule } from '../../modules/safety/imageScanner';
import { supabaseAdmin } from '../../shared/supabase';
import { v4 as uuidv4 } from 'uuid';

function getParamId(req: AuthRequest): string {
  const v = req.params.id;
  return Array.isArray(v) ? v[0] : v;
}

function getParam(req: AuthRequest, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

// ─── Items ───────────────────────────────────────────────────────────────

export const createValidationItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const auth = buildAuthContext(req.user);

    const body = req.body as {
      source_module: string;
      source_entity_id: string;
      item_type: string;
      title: string;
      campaign_id?: string;
      platform?: string;
      content_snapshot?: Record<string, unknown>;
      risk_level?: string;
      due_at?: string;
    };

    if (!body.source_module || !body.source_entity_id || !body.item_type || !body.title) {
      return res.status(400).json({ error: 'source_module, source_entity_id, item_type, and title are required' });
    }

    const item = await validationService.createValidationItem({
      tenant_id,
      workspace_id: tenant_id,
      source_module: body.source_module,
      source_entity_id: body.source_entity_id,
      item_type: body.item_type as any,
      title: body.title,
      campaign_id: body.campaign_id,
      platform: body.platform,
      content_snapshot: body.content_snapshot,
      submitted_by: userId,
      risk_level: body.risk_level as any,
      due_at: body.due_at,
    }, auth);

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

async function resolveUserInfo(userIds: string[]): Promise<Record<string, { name: string; role: string }>> {
  if (!userIds.length) return {};
  const [usersRes, membersRes] = await Promise.all([
    supabaseAdmin.from('users').select('id, full_name, email').in('id', userIds),
    supabaseAdmin.from('workspace_members').select('user_id, role').in('user_id', userIds),
  ]);
  const roleMap: Record<string, string> = {};
  (membersRes.data || []).forEach((m: any) => { roleMap[m.user_id] = m.role; });
  const map: Record<string, { name: string; role: string }> = {};
  (usersRes.data || []).forEach((u: any) => {
    map[u.id] = { name: u.full_name || u.email || 'Unknown', role: roleMap[u.id] || 'Creator' };
  });
  return map;
}

export const listValidationItems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const result = await validationService.listValidationItems({
      tenant_id,
      validation_status: req.query.validation_status as string,
      assigned_validator: req.query.assigned_validator as string,
      risk_level: req.query.risk_level as string,
      item_type: req.query.item_type as string,
      source_module: req.query.source_module as string,
      campaign_id: req.query.campaign_id as string,
      highest_severity: req.query.highest_severity as string,
      search: req.query.search as string,
      override_only: req.query.override_only === 'true',
      blocked_only: req.query.blocked_only === 'true',
      revalidation_needed: req.query.revalidation_needed === 'true',
      manual_check_required: req.query.manual_check_required === 'true',
      overdue_only: req.query.overdue_only === 'true',
      sort_by: req.query.sort_by as string,
      sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 25,
    });

    const rawItems: any[] = result.items || [];
    const userIds = [...new Set(rawItems.map((i: any) => i.submitted_by).filter(Boolean))] as string[];
    const userMap = await resolveUserInfo(userIds);
    const enrichedItems = rawItems.map((i: any) => ({
      ...i,
      submitter_name: userMap[i.submitted_by]?.name,
      submitter_role: userMap[i.submitted_by]?.role,
    }));

    res.json({ success: true, data: enrichedItems, total: result.total });
  } catch (error) {
    next(error);
  }
};

export const getValidationItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await validationService.getValidationItem(getParamId(req));
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const assignValidator = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const auth = buildAuthContext(req.user);
    await validationService.assignValidator(getParamId(req), req.body.validator_id, performed_by, tenant_id, auth);
    res.json({ success: true, message: 'Validator assigned' });
  } catch (error) {
    next(error);
  }
};

// ─── Validation Runs ─────────────────────────────────────────────────────

// Load active keyword rules for the workspace from the approval_rules table
async function loadKeywordRules(tenantId: string): Promise<KeywordRule[]> {
  try {
    const { data } = await supabaseAdmin
      .from('approval_rules')
      .select('id, keyword_rules')
      .eq('tenant_id', tenantId)
      .in('rule_status', ['ACTIVE', 'DRAFT']); // include DRAFT so new rules are tested immediately
    if (!data) return [];
    const rules: KeywordRule[] = [];
    for (const row of data) {
      const krs = row.keyword_rules;
      if (!Array.isArray(krs)) continue;
      for (const kr of krs) {
        if (Array.isArray(kr.keywords) && kr.keywords.length > 0 && kr.action) {
          rules.push({ id: row.id, keywords: kr.keywords, action: kr.action });
        }
      }
    }
    return rules;
  } catch {
    return []; // non-blocking — scan proceeds without keyword rules
  }
}

async function performAiScan(
  content: string,
  tenantId: string,
  platform?: string,
  imageUrls: string[] = [],
  keywordRules: KeywordRule[] = [],
): Promise<{
  ruleResults: Array<{
    rule_name: string; rule_category: validationService.RuleCategory;
    result: validationService.RuleResult; severity: validationService.Severity;
    explanation?: string; affected_text?: string; recommended_fix?: string;
    override_eligible?: boolean; manual_check_required?: boolean;
  }>;
  sourceGrounding: Array<{
    claim_text: string; source_reference?: string; source_status?: string;
    source_confidence?: string; grounding_status: validationService.GroundingStatus;
    issue_summary?: string;
  }>;
  imageViolationActions: Set<'BLOCK' | 'REQUEST_REVIEW'>;
}> {
  const modResult = await moderate({
    content,
    tenantId,
    workspaceId: tenantId,
    platform,
  });

  const ruleResults: Array<{
    rule_name: string;
    rule_category: validationService.RuleCategory;
    result: validationService.RuleResult;
    severity: validationService.Severity;
    explanation?: string;
    affected_text?: string;
    recommended_fix?: string;
    override_eligible?: boolean;
    manual_check_required?: boolean;
  }> = [];

  const sourceGrounding: Array<{
    claim_text: string;
    source_reference?: string;
    source_status?: string;
    source_confidence?: string;
    grounding_status: validationService.GroundingStatus;
    issue_summary?: string;
  }> = [];

  const mapSeverity = (sev: string): validationService.Severity => {
    const s = (sev || 'low').toUpperCase();
    if (s === 'CRITICAL') return 'CRITICAL';
    if (s === 'HIGH') return 'HIGH';
    if (s === 'MEDIUM') return 'MEDIUM';
    return 'LOW';
  };

  const getScore = (cat: string): number => {
    return (modResult.categoryScores as Record<string, number>)[cat] || 0;
  };

  // 1. Brand Safety check (competitor_risk)
  const compScore = getScore('competitor_risk');
  if (compScore > 0.6) {
    ruleResults.push({
      rule_name: 'Competitor Risk Check',
      rule_category: 'brand_rules',
      result: 'FAILED',
      severity: 'HIGH',
      explanation: 'Found critical mentions of competitors which may violate brand collision guidelines.',
      override_eligible: true,
    });
  } else if (compScore > 0) {
    ruleResults.push({
      rule_name: 'Competitor Risk Check',
      rule_category: 'brand_rules',
      result: 'WARNING',
      severity: 'MEDIUM',
      explanation: 'Potential competitor references detected in the content.',
      override_eligible: true,
    });
  } else {
    ruleResults.push({
      rule_name: 'Competitor Risk Check',
      rule_category: 'brand_rules',
      result: 'PASSED',
      severity: 'LOW',
      explanation: 'No competitor risks identified.',
    });
  }

  // 2. Content Safety Policy (hate_speech, harassment, sexual_content, violence, self_harm)
  const policyCategories = ['hate_speech', 'harassment', 'sexual_content', 'violence', 'self_harm'];
  const matchedPolicyCat = policyCategories.find(cat => getScore(cat) > 0);
  if (matchedPolicyCat) {
    const score = getScore(matchedPolicyCat);
    const resultStatus: validationService.RuleResult = score > 0.6 ? 'BLOCKED' : 'FAILED';
    const severityStatus = mapSeverity(modResult.severity);
    ruleResults.push({
      rule_name: 'Safety Policy Check',
      rule_category: 'policy_rules',
      result: resultStatus,
      severity: severityStatus,
      explanation: `Content flagged for policy violation: ${matchedPolicyCat} (risk score: ${score.toFixed(2)}).`,
      recommended_fix: 'Remove or revise policy-violating text/images.',
      override_eligible: resultStatus === 'FAILED',
    });
  } else {
    ruleResults.push({
      rule_name: 'Safety Policy Check',
      rule_category: 'policy_rules',
      result: 'PASSED',
      severity: 'LOW',
      explanation: 'No safety policy violations detected.',
    });
  }

  // 3. Data Compliance & Security (confidential_data_leakage, prompt_injection)
  const leakageScore = getScore('confidential_data_leakage');
  const injectionScore = getScore('prompt_injection');
  if (leakageScore > 0.6 || injectionScore > 0.6) {
    ruleResults.push({
      rule_name: 'Data Leakage & Security Scan',
      rule_category: 'compliance_checks',
      result: 'BLOCKED',
      severity: 'CRITICAL',
      explanation: leakageScore > 0.6 
        ? 'Sensitive personal credentials or PII leak detected.'
        : 'Potential malicious system instruction override / prompt injection detected.',
      override_eligible: false,
    });
  } else if (leakageScore > 0 || injectionScore > 0) {
    ruleResults.push({
      rule_name: 'Data Leakage & Security Scan',
      rule_category: 'compliance_checks',
      result: 'FAILED',
      severity: 'HIGH',
      explanation: 'Potential compliance or prompt injection warning detected.',
      override_eligible: true,
    });
  } else {
    ruleResults.push({
      rule_name: 'Data Leakage & Security Scan',
      rule_category: 'compliance_checks',
      result: 'PASSED',
      severity: 'LOW',
      explanation: 'No sensitive data leakage or injection patterns detected.',
    });
  }

  // 4. Tone & Profanity (offensive_language)
  const offensiveScore = getScore('offensive_language');
  if (offensiveScore > 0.6) {
    ruleResults.push({
      rule_name: 'Tone & Profanity Filter',
      rule_category: 'tone_sensitivity',
      result: 'FAILED',
      severity: 'HIGH',
      explanation: 'Profanity or offensive language detected.',
      override_eligible: true,
    });
  } else if (offensiveScore > 0) {
    ruleResults.push({
      rule_name: 'Tone & Profanity Filter',
      rule_category: 'tone_sensitivity',
      result: 'WARNING',
      severity: 'MEDIUM',
      explanation: 'Slightly offensive or inappropriate tone detected.',
      override_eligible: true,
    });
  } else {
    ruleResults.push({
      rule_name: 'Tone & Profanity Filter',
      rule_category: 'tone_sensitivity',
      result: 'PASSED',
      severity: 'LOW',
      explanation: 'Tone is appropriate and free of offensive language.',
    });
  }

  // 5. Platform Ad Suitability (platform_unsafe)
  const platformScore = getScore('platform_unsafe');
  if (platformScore > 0.6) {
    ruleResults.push({
      rule_name: 'Platform Ad Suitability',
      rule_category: 'platform_readiness',
      result: 'FAILED',
      severity: 'HIGH',
      explanation: 'Content does not meet the advertising suitability guidelines.',
      override_eligible: true,
    });
  } else if (platformScore > 0) {
    ruleResults.push({
      rule_name: 'Platform Ad Suitability',
      rule_category: 'platform_readiness',
      result: 'WARNING',
      severity: 'LOW',
      explanation: 'Content might have issues with ad suitability on some networks.',
      override_eligible: true,
    });
  } else {
    ruleResults.push({
      rule_name: 'Platform Ad Suitability',
      rule_category: 'platform_readiness',
      result: 'PASSED',
      severity: 'LOW',
      explanation: 'Content is suitable for ad platforms.',
    });
  }

  // 6. Regulated Claims (regulated_claims)
  const claimsScore = getScore('regulated_claims');
  if (claimsScore > 0.6) {
    ruleResults.push({
      rule_name: 'Regulated Claims & Disclosures',
      rule_category: 'claim_safety',
      result: 'FAILED',
      severity: 'HIGH',
      explanation: 'Content contains financial, health, or other regulated claims without required disclaimers.',
      recommended_fix: 'Include a standard compliance footer or modify the claims.',
      override_eligible: true,
    });
  } else if (claimsScore > 0) {
    ruleResults.push({
      rule_name: 'Regulated Claims & Disclosures',
      rule_category: 'claim_safety',
      result: 'WARNING',
      severity: 'MEDIUM',
      explanation: 'Potential regulated statements or marketing claims detected.',
      override_eligible: true,
    });
  } else {
    ruleResults.push({
      rule_name: 'Regulated Claims & Disclosures',
      rule_category: 'claim_safety',
      result: 'PASSED',
      severity: 'LOW',
      explanation: 'No regulated claims or disclosures required.',
    });
  }

  // Grounding matching
  const allMatches = modResult.matches || [];
  if (allMatches.length > 0) {
    for (const match of allMatches) {
      const status: validationService.GroundingStatus = match.score > 0.6 ? 'UNGROUNDED' : 'PARTIALLY_GROUNDED';
      sourceGrounding.push({
        claim_text: `Safety Check: Matched "${match.pattern}" in safety category "${match.category}"`,
        source_reference: match.source === 'groq' ? 'Groq AI Auditor' : 'Local Verification Dictionary',
        source_status: 'flagged',
        source_confidence: match.score.toFixed(2),
        grounding_status: status,
        issue_summary: `The safety engine flagged this pattern with score ${match.score}.`,
      });
    }
  } else {
    sourceGrounding.push({
      claim_text: content.length > 60 ? content.slice(0, 60) + '...' : content,
      source_reference: 'Knowledge Base & Policy Guides',
      source_status: 'verified',
      source_confidence: '1.00',
      grounding_status: 'GROUNDED',
      issue_summary: 'Statement is grounded by local policy checks.',
    });
  }

  // 7. Gate Exit Readiness (approval_readiness)
  const hasFailedOrBlocked = ruleResults.some(r => r.result === 'FAILED' || r.result === 'BLOCKED');
  const hasWarnings = ruleResults.some(r => r.result === 'WARNING');
  const hasGroundingFailures = sourceGrounding.some(g => g.grounding_status !== 'GROUNDED');

  if (hasFailedOrBlocked || hasGroundingFailures) {
    ruleResults.push({
      rule_name: 'Gate Exit Readiness',
      rule_category: 'approval_readiness',
      result: 'FAILED',
      severity: 'HIGH',
      explanation: 'Content has active scan failures. Address rules/claims before final release.',
      override_eligible: false,
    });
  } else if (hasWarnings) {
    ruleResults.push({
      rule_name: 'Gate Exit Readiness',
      rule_category: 'approval_readiness',
      result: 'WARNING',
      severity: 'MEDIUM',
      explanation: 'Warnings detected. Content is eligible for release, but review is recommended.',
      override_eligible: true,
    });
  } else {
    ruleResults.push({
      rule_name: 'Gate Exit Readiness',
      rule_category: 'approval_readiness',
      result: 'PASSED',
      severity: 'LOW',
      explanation: 'All validation criteria met. Ready for approvals.',
    });
  }

  // ── Image scanning ────────────────────────────────────────────────────────
  const imageViolationActions = new Set<'BLOCK' | 'REQUEST_REVIEW'>();

  if (imageUrls.length > 0) {
    for (const url of imageUrls) {
      let imgResult;
      try {
        imgResult = await scanImage(url, keywordRules, undefined, tenantId);
      } catch {
        continue;
      }
      if (imgResult.skipped) continue;

      for (const v of imgResult.violations) {
        imageViolationActions.add(v.action);

        if (v.type === 'sensitive_content') {
          ruleResults.push({
            rule_name: `Image Sensitive Content: ${v.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`,
            rule_category: 'policy_rules',
            result: 'BLOCKED',
            severity: 'CRITICAL',
            explanation: v.description,
            recommended_fix: 'Remove or replace the image with appropriate content.',
            override_eligible: false,
          });
        } else if (v.type === 'keyword_match') {
          const action = v.action === 'BLOCK' ? 'BLOCKED' : 'FAILED';
          ruleResults.push({
            rule_name: `Image Keyword Match: "${v.matchedKeyword}"`,
            rule_category: 'brand_rules',
            result: action as validationService.RuleResult,
            severity: v.action === 'BLOCK' ? 'HIGH' : 'MEDIUM',
            explanation: v.description,
            affected_text: imgResult.extractedText?.slice(0, 200),
            recommended_fix: v.action === 'BLOCK'
              ? 'Remove the image — it contains restricted keywords.'
              : 'Review the image content and address flagged keywords.',
            override_eligible: v.action !== 'BLOCK',
            manual_check_required: v.action === 'REQUEST_REVIEW',
          });
        }
      }

      // If Gemini extracted text from the image, also run text moderation on it
      if (imgResult.extractedText && imgResult.extractedText.trim().length > 10) {
        try {
          const textScan = await moderate({ content: imgResult.extractedText, tenantId, workspaceId: tenantId, platform, localOnly: true });
          if (!textScan.safe) {
            ruleResults.push({
              rule_name: 'Image Embedded Text Safety',
              rule_category: 'policy_rules',
              result: 'FAILED',
              severity: textScan.severity.toUpperCase() as validationService.Severity,
              explanation: `Unsafe text found inside image: "${imgResult.extractedText.slice(0, 80)}…"`,
              affected_text: imgResult.extractedText.slice(0, 200),
              override_eligible: true,
            });
          }
        } catch { /* non-blocking */ }
      }
    }
  }

  return { ruleResults, sourceGrounding, imageViolationActions };
}

export const runValidation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const auth = buildAuthContext(req.user);
    const itemId = getParamId(req);

    await validationService.updateValidationStatus(itemId, 'IN_VALIDATION', performed_by, tenant_id, auth);

    const run = await validationService.createValidationRun({
      validation_item_id: itemId,
      rule_set_id: req.body.rule_set_id,
      rule_set_version: req.body.rule_set_version,
      run_by: performed_by,
    }, auth);

    const item = await validationService.getValidationItem(itemId);
    let contentToModerate = '';
    if (item.content_snapshot) {
      contentToModerate = (item.content_snapshot.copy as string) || (item.content_snapshot.universal as string) || item.title || '';
    } else {
      contentToModerate = item.title || '';
    }

    const imageUrls: string[] = (() => {
      const snap = item.content_snapshot;
      if (!snap) return [];
      const raw = snap.urls || snap.media_urls || snap.images || snap.image_urls;
      if (Array.isArray(raw)) return raw.filter((u): u is string => typeof u === 'string');
      if (typeof snap.url === 'string') return [snap.url];
      if (typeof snap.image_url === 'string') return [snap.image_url];
      return [];
    })();

    const keywordRules = await loadKeywordRules(tenant_id);

    let rule_results = req.body.rule_results;
    let source_grounding = req.body.source_grounding;
    let imageViolationActions = new Set<'BLOCK' | 'REQUEST_REVIEW'>();

    if (!rule_results || rule_results.length === 0) {
      const scan = await performAiScan(contentToModerate, tenant_id, item.platform, imageUrls, keywordRules);
      rule_results = scan.ruleResults;
      source_grounding = scan.sourceGrounding;
      imageViolationActions = scan.imageViolationActions;
    }

    const results = await validationService.completeValidationRun(run.id as string, {
      rule_results: rule_results || [],
      source_grounding: source_grounding,
    }, auth);

    let finalStatus: validationService.ValidationStatus =
      results.failed_count > 0 ? 'FAILED' : results.warning_count > 0 ? 'WARNING' : 'PASSED';

    if (imageViolationActions.has('BLOCK') || results.blocked_count > 0) {
      finalStatus = 'BLOCKED';
      try {
        await createReviewItem({
          tenant_id, workspace_id: tenant_id, source_module: 'validation_desk',
          source_entity_id: itemId, item_type: 'validation_failed',
          title: `[BLOCKED] Image violation: ${item.title || 'Untitled'}`,
          submitted_by: performed_by, risk_level: 'HIGH',
          content_snapshot: (item.content_snapshot as Record<string, unknown>) || {},
        });
      } catch { /* non-blocking */ }
    }

    if (imageViolationActions.has('REQUEST_REVIEW') && finalStatus !== 'BLOCKED') {
      finalStatus = 'NEEDS_REVISION';
      try {
        await supabaseAdmin.from('notifications').insert({
          id: uuidv4(), user_id: item.submitted_by,
          title: '⚠️ Validation Desk: Image Review Required',
          body: `Your media asset "${item.title}" was flagged — image content matches restricted keywords. Please review and resubmit.`,
          type: 'GOVERNANCE', link: '/validation', read: false,
        });
      } catch { /* non-blocking */ }
    }

    await validationService.updateValidationStatus(itemId, finalStatus, performed_by, tenant_id, auth);

    res.json({ success: true, data: { run, results } });
  } catch (error) {
    next(error);
  }
};

export const revalidateItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const auth = buildAuthContext(req.user);
    const itemId = getParamId(req);

    await validationService.updateValidationStatus(itemId, 'PENDING_VALIDATION', performed_by, tenant_id, auth);

    const run = await validationService.createValidationRun({
      validation_item_id: itemId,
      rule_set_version: req.body.rule_set_version,
      run_by: performed_by,
    }, auth);

    const item = await validationService.getValidationItem(itemId);
    let contentToModerate = '';
    if (item.content_snapshot) {
      contentToModerate = (item.content_snapshot.copy as string) || (item.content_snapshot.universal as string) || item.title || '';
    } else {
      contentToModerate = item.title || '';
    }

    const imageUrls: string[] = (() => {
      const snap = item.content_snapshot;
      if (!snap) return [];
      const raw = snap.urls || snap.media_urls || snap.images || snap.image_urls;
      if (Array.isArray(raw)) return raw.filter((u): u is string => typeof u === 'string');
      if (typeof snap.url === 'string') return [snap.url];
      if (typeof snap.image_url === 'string') return [snap.image_url];
      return [];
    })();

    const keywordRules = await loadKeywordRules(tenant_id);

    let rule_results = req.body.rule_results;
    let source_grounding = req.body.source_grounding;
    let imageViolationActions = new Set<'BLOCK' | 'REQUEST_REVIEW'>();

    if (!rule_results || rule_results.length === 0) {
      const scan = await performAiScan(contentToModerate, tenant_id, item.platform, imageUrls, keywordRules);
      rule_results = scan.ruleResults;
      source_grounding = scan.sourceGrounding;
      imageViolationActions = scan.imageViolationActions;
    }

    const results = await validationService.completeValidationRun(run.id as string, {
      rule_results: rule_results || [],
      source_grounding: source_grounding,
    }, auth);

    let finalStatus: validationService.ValidationStatus =
      results.failed_count > 0 ? 'FAILED' : results.warning_count > 0 ? 'WARNING' : 'PASSED';

    if (imageViolationActions.has('BLOCK') || results.blocked_count > 0) {
      finalStatus = 'BLOCKED';
      try {
        await createReviewItem({
          tenant_id, workspace_id: tenant_id, source_module: 'validation_desk',
          source_entity_id: itemId, item_type: 'validation_failed',
          title: `[BLOCKED] Image violation: ${item.title || 'Untitled'}`,
          submitted_by: performed_by, risk_level: 'HIGH',
          content_snapshot: (item.content_snapshot as Record<string, unknown>) || {},
        });
      } catch { /* non-blocking */ }
    }

    if (imageViolationActions.has('REQUEST_REVIEW') && finalStatus !== 'BLOCKED') {
      finalStatus = 'NEEDS_REVISION';
      try {
        await supabaseAdmin.from('notifications').insert({
          id: uuidv4(), user_id: item.submitted_by,
          title: '⚠️ Validation Desk: Image Review Required',
          body: `Your media asset "${item.title}" was flagged — image content matches restricted keywords. Please review and resubmit.`,
          type: 'GOVERNANCE', link: '/validation', read: false,
        });
      } catch { /* non-blocking */ }
    }

    await validationService.updateValidationStatus(itemId, finalStatus, performed_by, tenant_id, auth);

    res.json({ success: true, data: { run, results } });
  } catch (error) {
    next(error);
  }
};

export const getValidationRunResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const results = await validationService.getValidationRunResults(getParam(req, 'runId'));
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

// ─── Actions ─────────────────────────────────────────────────────────────

export const requestRevision = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const auth = buildAuthContext(req.user);
    const { revision_instruction } = req.body;
    if (!revision_instruction) return res.status(400).json({ success: false, message: 'Revision instruction required' });

    await validationService.updateValidationStatus(getParamId(req), 'NEEDS_REVISION', performed_by, tenant_id, auth);
    res.json({ success: true, message: 'Revision requested' });
  } catch (error) {
    next(error);
  }
};

export const sendToReviewQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const auth = buildAuthContext(req.user);
    const item = await validationService.getValidationItem(getParamId(req));

    const eligibility = validationService.calculateEligibility({
      validation_status: item.validation_status,
      has_blocked_rules: item.blocked_rule_count > 0,
      has_unresolved_manual_checks: item.manual_check_count > 0,
      has_stale_validation: item.validation_status === 'REVALIDATION_NEEDED',
      has_override_eligible_rules: item.overrides && item.overrides.length > 0 || false,
    });

    if (!eligibility.send_to_review_queue_allowed) {
      return res.status(400).json({ success: false, message: `Cannot send to Review Queue: ${eligibility.state}` });
    }

    await createReviewItem({
      tenant_id,
      workspace_id: tenant_id,
      source_module: 'validation_desk',
      source_entity_id: getParamId(req),
      item_type: 'validation_failed',
      title: `Review: ${item.title || 'Validation Item'}`,
      submitted_by: performed_by,
      risk_level: (item.risk_level as any) || 'LOW',
      content_snapshot: (item.content_snapshot as Record<string, unknown>) || {},
    });

    await validationService.updateValidationStatus(getParamId(req), 'COMPLETED', performed_by, tenant_id, auth);
    res.json({ success: true, message: 'Sent to Review Queue' });
  } catch (error) {
    next(error);
  }
};

export const sendToApprovals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const auth = buildAuthContext(req.user);
    const item = await validationService.getValidationItem(getParamId(req));

    const eligibility = validationService.calculateEligibility({
      validation_status: item.validation_status,
      has_blocked_rules: item.blocked_rule_count > 0,
      has_unresolved_manual_checks: item.manual_check_count > 0,
      has_stale_validation: item.validation_status === 'REVALIDATION_NEEDED',
      has_override_eligible_rules: item.overrides && item.overrides.length > 0 || false,
    });

    if (!eligibility.send_to_approvals_allowed) {
      return res.status(400).json({ success: false, message: `Cannot send to Approvals: ${eligibility.state}` });
    }

    await createApprovalItem({
      tenant_id,
      workspace_id: tenant_id,
      source_module: 'validation_desk',
      source_entity_id: getParamId(req),
      item_type: 'VALIDATION_OVERRIDE',
      title: `Approval: ${item.title || 'Validation Item'}`,
      submitted_by: performed_by,
      risk_level: (item.risk_level as string) || 'LOW',
    });

    await validationService.updateValidationStatus(getParamId(req), 'COMPLETED', performed_by, tenant_id, auth);
    res.json({ success: true, message: 'Sent to Approvals' });
  } catch (error) {
    next(error);
  }
};

export const escalateValidation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const auth = buildAuthContext(req.user);
    const { escalation_reason } = req.body;
    if (!escalation_reason) return res.status(400).json({ success: false, message: 'Escalation reason required' });

    await validationService.updateValidationStatus(getParamId(req), 'ESCALATION_REQUIRED', performed_by, tenant_id, auth);
    res.json({ success: true, message: 'Validation escalated' });
  } catch (error) {
    next(error);
  }
};

export const applyOverride = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const auth = buildAuthContext(req.user);
    const { rule_result_id, override_reason, risk_acknowledgement, note } = req.body;

    if (!override_reason) return res.status(400).json({ success: false, message: 'Override reason required' });

    await validationService.applyOverride({
      validation_item_id: getParamId(req),
      rule_result_id,
      override_reason,
      risk_acknowledgement,
      note,
      overridden_by: performed_by,
      tenant_id,
    }, auth);
    res.json({ success: true, message: 'Override applied' });
  } catch (error) {
    next(error);
  }
};

export const blockItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const auth = buildAuthContext(req.user);
    const { block_reason } = req.body;
    if (!block_reason) return res.status(400).json({ success: false, message: 'Block reason required' });

    await validationService.updateValidationStatus(getParamId(req), 'BLOCKED', performed_by, tenant_id, auth);
    res.json({ success: true, message: 'Item blocked' });
  } catch (error) {
    next(error);
  }
};

export const completeManualCheck = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const auth = buildAuthContext(req.user);
    const { manual_check_result, note } = req.body;

    await validationService.completeManualCheck({
      validation_item_id: getParamId(req),
      rule_result_id: req.body.rule_result_id,
      assigned_validator: performed_by,
      manual_check_result: manual_check_result || 'PASSED',
      note,
      completed_by: performed_by,
      tenant_id,
    }, auth);
    res.json({ success: true, message: 'Manual check completed' });
  } catch (error) {
    next(error);
  }
};

// ─── Notes ───────────────────────────────────────────────────────────────

export const addValidatorNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const created_by = req.user?.id || '';
    const auth = buildAuthContext(req.user);
    const note = await validationService.addNote({
      validation_item_id: getParamId(req),
      note_body: req.body.note_body,
      parent_note_id: req.body.parent_note_id,
      created_by,
    }, auth);
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

// ─── Audit Log ───────────────────────────────────────────────────────────

export const getValidationAuditTrail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const log = await validationService.getAuditLog(getParamId(req));
    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

// ─── Stats & Eligibility ─────────────────────────────────────────────────

export const getValidationStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const stats = await validationService.getValidationStats(tenant_id);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const getValidationEligibility = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await validationService.getValidationItem(getParamId(req));
    const has_override_eligible_rules = (item as any).runs?.some((r: any) =>
      r.rule_results?.some((rr: any) => rr.override_eligible)
    ) || false;
    const eligibility = validationService.calculateEligibility({
      validation_status: item.validation_status,
      has_blocked_rules: item.blocked_rule_count > 0,
      has_unresolved_manual_checks: item.manual_check_count > 0,
      has_stale_validation: item.validation_status === 'REVALIDATION_NEEDED',
      has_override_eligible_rules,
    });
    res.json({ success: true, data: eligibility });
  } catch (error) {
    next(error);
  }
};

// ─── Callbacks ───────────────────────────────────────────────────────────

export const retryValidationCallback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const auth = buildAuthContext(req.user);
    const cb = await validationService.retryCallback(getParam(req, 'callbackId'), performed_by, tenant_id, auth);
    res.json({ success: true, data: cb });
  } catch (error) {
    next(error);
  }
};

// ─── Export ──────────────────────────────────────────────────────────────

export const exportValidationRecord = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await validationService.getValidationItem(getParamId(req));
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const getValidationRuns = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { const runs = await validationService.getValidationRuns(getParamId(req)); res.json({ success: true, data: runs }); } catch (error) { next(error); }
};

export const getValidationGrounding = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { const data = await validationService.getGroundingResults(getParamId(req)); res.json({ success: true, data }); } catch (error) { next(error); }
};

export const getValidationNotesList = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { const notes = await validationService.getValidationNotes(getParamId(req)); res.json({ success: true, data: notes }); } catch (error) { next(error); }
};

export const getValidationManualChecks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { const checks = await validationService.getManualChecks(getParamId(req)); res.json({ success: true, data: checks }); } catch (error) { next(error); }
};

export const getValidationApprovalReadiness = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { const data = await validationService.getApprovalReadiness(getParamId(req)); res.json({ success: true, data }); } catch (error) { next(error); }
};

export const getValidationRuleHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { const data = await validationService.getRuleHistory(getParamId(req)); res.json({ success: true, data }); } catch (error) { next(error); }
};

export const returnToCreator = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const auth = buildAuthContext(req.user);
    const itemId = getParamId(req);
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({ success: false, message: 'Revision instructions/notes are required' });
    }

    const item = await validationService.getValidationItem(itemId);

    // 1. Update validation item status to NEEDS_REVISION
    await validationService.updateValidationStatus(itemId, 'NEEDS_REVISION', performed_by, tenant_id, auth);

    // 2. Add validator note to the validation item
    await validationService.addNote({
      validation_item_id: itemId,
      note_body: note,
      created_by: performed_by
    }, auth);

    // 3. Send notification to the creator
    await supabaseAdmin
      .from('notifications')
      .insert({
        id: uuidv4(),
        user_id: item.submitted_by,
        title: '⚠️ Validation Desk: Action Required',
        body: `Your media asset "${item.title}" was returned by the validator: ${note}`,
        type: 'GOVERNANCE',
        link: '/validation',
        read: false
      });

    res.json({ success: true, message: 'Returned to creator successfully' });
  } catch (error) {
    next(error);
  }
};
