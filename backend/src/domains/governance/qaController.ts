import { Response, NextFunction } from 'express';
import OpenAI from 'openai';
import { env } from '../../config/env';
import { AuthRequest } from '../../shared/authMiddleware';
import * as qaService from '../../services/qualityAudit.service';
import { DEFAULT_TENANT_ID } from '../../shared/constants';
import { logger } from '../../shared/logger';

function getParamId(req: AuthRequest): string {
  const v = req.params.id;
  return Array.isArray(v) ? v[0] : v;
}

function getParam(req: AuthRequest, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

// ─── AI-Powered Quality Check ─────────────────────────────────

export const performQualityCheck = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { content, platforms, imageBase64 } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!content && !imageBase64) {
      return res.status(400).json({ success: false, message: 'Missing content or image' });
    }
    if (!env.GROQ_API_KEY) {
      return res.status(500).json({ success: false, message: 'QA Intelligence Engine (Groq) not configured' });
    }
    const groq = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
    const prompt = `
    Act as a Senior Quality Assurance Specialist and Brand Governance Officer.
    Perform a deep forensic analysis of the following social media content.
    
    CONTENT: "${content || 'Image-based content'}"
    TARGET PLATFORMS: ${platforms?.join(', ') || 'General'}
    
    EVALUATE THE FOLLOWING METRICS (Score 0-100):
    1. Brand Alignment: Tone, voice consistency, and visual brand identity.
    2. Factual Accuracy: Check for logical inconsistencies or obvious falsehoods.
    3. Formatting: Proper spacing, line breaks, and character counts.
    4. Accessibility: Alt-text quality, readability, and inclusivity.
    5. Platform Readiness: Adherence to specific platform best practices.
    6. Compliance Posture: Legal risks, restricted keywords, or copyright flags.
    7. Content Quality: Grammar, vocabulary depth, and engagement hook strength.
    8. Publishing Fitness: Overall score indicating if it's ready for the public.

    RESPONSE FORMAT (STRICT JSON):
    {
      "scores": {
        "brand_alignment": number, "factual_accuracy": number, "formatting": number,
        "accessibility": number, "platform_readiness": number, "compliance": number,
        "content_quality": number, "publishing_fitness": number
      },
      "feedback": [
        { "category": "string", "issue": "string", "suggestion": "string", "severity": "low" | "medium" | "high" }
      ],
      "summary": "string",
      "sentiment": { "positive": number, "neutral": number, "negative": number, "tone": "string" },
      "optimized_content": "string"
    }`;
    logger.info({ userId, platforms }, '[QA] Performing quality check');
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });
    const text = completion.choices[0].message.content;
    if (!text) throw new Error('QA Engine returned empty response');
    const result = JSON.parse(text);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error({ error }, '[QA] Quality check failed');
    next(error);
  }
};

// ─── Items ─────────────────────────────────────────────────────

export const listAuditItems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const result = await qaService.listAuditItems({
      tenant_id,
      audit_status: req.query.audit_status as string,
      assigned_auditor: req.query.assigned_auditor as string,
      risk_level: req.query.risk_level as string,
      item_type: req.query.item_type as string,
      source_module: req.query.source_module as string,
      campaign_id: req.query.campaign_id as string,
      search: req.query.search as string,
      sort_by: req.query.sort_by as string,
      sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 25,
    });
    res.json({ success: true, data: result.items, total: result.total });
  } catch (error) {
    next(error);
  }
};

export const getAuditItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await qaService.getAuditItem(getParamId(req));
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const getQaAuditStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const assigned_auditor = req.query.assigned_auditor as string;
    const stats = await qaService.getAuditStats(tenant_id, assigned_auditor ? { assigned_auditor } : undefined);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const getAuditEligibility = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await qaService.getAuditItem(getParamId(req));
    const hasUnresolvedCritical = (item.defects as any[])?.some?.((d: any) =>
      !d.resolved_at && (d.defect_severity === 'MAJOR' || d.defect_severity === 'CRITICAL')
    ) || false;
    const eligibility = qaService.calculateEligibility({
      has_scorecard: !!item.scorecard,
      has_unresolved_major_or_critical: hasUnresolvedCritical,
      published_mismatch: !!item.published_mismatch,
      has_evidence: !!((item.evidence as any[])?.length),
      audit_status: item.audit_status || '',
      risk_level: item.risk_level || 'LOW',
      has_score_override: !!((item.scorecard as any)?.score_override),
    });
    res.json({ success: true, data: eligibility });
  } catch (error) {
    next(error);
  }
};

export const getQaAuditTrail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const log = await qaService.getAuditLog(getParamId(req));
    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

// ─── Actions ────────────────────────────────────────────────────

export const startAudit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    await qaService.updateAuditStatus(getParamId(req), 'IN_AUDIT', userId, { tenant_id: userId });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const passAudit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    await qaService.updateAuditStatus(getParamId(req), 'PASSED', userId, { tenant_id: userId });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const failAudit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const { failure_reason, severity_classification } = req.body;
    await qaService.updateAuditStatus(getParamId(req), 'FAILED', userId, { tenant_id: userId });
    await qaService.createDefect({
      audit_item_id: getParamId(req),
      defect_category: 'accuracy_issue',
      defect_severity: severity_classification || 'MODERATE',
      defect_description: failure_reason || 'Failed audit',
      created_by: userId,
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const needsCorrection = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const { correction_reason } = req.body;
    await qaService.updateAuditStatus(getParamId(req), 'NEEDS_CORRECTION', userId, { tenant_id: userId });
    await qaService.createCorrectiveAction({
      audit_item_id: getParamId(req),
      title: correction_reason || 'Needs correction',
      priority: 'MEDIUM',
      required_action: correction_reason || '',
      created_by: userId,
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const escalateAudit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    await qaService.updateAuditStatus(getParamId(req), 'ESCALATED', userId, { tenant_id: userId });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const closeAudit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    await qaService.updateAuditStatus(getParamId(req), 'CLOSED', userId, { tenant_id: userId });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const assignAuditorToItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const tenant_id = req.user?.workspace_id || userId;
    const { auditor_id } = req.body;
    if (!auditor_id) return res.status(400).json({ error: 'auditor_id required' });
    await qaService.assignAuditor(getParamId(req), auditor_id, userId, tenant_id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─── Scorecards ────────────────────────────────────────────────

export const saveScorecard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const result = await qaService.upsertScorecard({
      audit_item_id: getParamId(req),
      ...req.body,
      scored_by: userId,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const overrideScorecard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const tenant_id = req.user?.workspace_id || userId;
    const { score_override, score_override_reason, score_override_note } = req.body;
    await qaService.applyScoreOverride(getParamId(req), score_override, score_override_reason || '', score_override_note || '', userId, tenant_id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─── Defects ───────────────────────────────────────────────────

export const addDefect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const defect = await qaService.createDefect({
      audit_item_id: getParamId(req),
      defect_category: req.body.defect_category,
      defect_severity: req.body.defect_severity,
      defect_description: req.body.defect_description,
      evidence_reference: req.body.evidence_reference,
      corrective_action_required: req.body.corrective_action_required,
      created_by: userId,
    });
    res.json({ success: true, data: defect });
  } catch (error) {
    next(error);
  }
};

export const resolveDefect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const tenant_id = req.user?.workspace_id || userId;
    await qaService.resolveDefect(req.params.defectId as string, userId, tenant_id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─── Corrective Actions ────────────────────────────────────────

export const addCorrectiveAction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const action = await qaService.createCorrectiveAction({
      audit_item_id: getParamId(req),
      defect_id: req.body.defect_id,
      title: req.body.title,
      owner: req.body.owner,
      priority: req.body.priority || 'MEDIUM',
      required_action: req.body.required_action,
      due_at: req.body.due_at,
      created_by: userId,
    });
    res.json({ success: true, data: action });
  } catch (error) {
    next(error);
  }
};

export const updateCorrectiveAction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const tenant_id = req.user?.workspace_id || userId;
    await qaService.updateCorrectiveAction(req.params.actionId as string, req.body, userId, tenant_id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─── Notes & Evidence ──────────────────────────────────────────

export const addQaNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const note = await qaService.addAuditNote({
      audit_item_id: getParamId(req),
      note_body: req.body.note_body,
      created_by: userId,
    });
    res.json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

export const addQaEvidence = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || '';
    const evidence = await qaService.addEvidence({
      audit_item_id: getParamId(req),
      evidence_type: req.body.evidence_type,
      evidence_reference: req.body.evidence_reference,
      source_module: req.body.source_module,
      created_by: userId,
    });
    res.json({ success: true, data: evidence });
  } catch (error) {
    next(error);
  }
};

// ─── Sampling ──────────────────────────────────────────────────

export const generateSample = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const userId = req.user?.id || '';
    const result = await qaService.generateSample({
      tenant_id,
      workspace_id: tenant_id,
      source_module: req.body.source_module,
      count: parseInt(req.body.count) || 10,
      created_by: userId,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const retryQaCallback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const performed_by = req.user?.id || '';
    const cb = await qaService.retryCallback(getParam(req, 'callbackId'), performed_by, tenant_id);
    res.json({ success: true, data: cb });
  } catch (error) {
    next(error);
  }
};

export const exportQaFindings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.user?.workspace_id || DEFAULT_TENANT_ID;
    const { item_ids } = req.body;
    const items = item_ids?.length
      ? await Promise.all((item_ids as string[]).map((id: string) => qaService.getAuditItem(id).catch(() => null)))
      : await qaService.listAuditItems({ tenant_id, limit: 1000, page: 1 });
    res.json({ success: true, data: { exported_at: new Date().toISOString(), count: Array.isArray(items) ? items.filter(Boolean).length : 0 } });
  } catch (error) { next(error); }
};

export const exportQaEvidence = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { item_ids } = req.body;
    const evidenceResults = item_ids?.length
      ? await Promise.all((item_ids as string[]).map((id: string) => qaService.getEvidence(id).catch(() => [])))
      : [];
    res.json({ success: true, data: { exported_at: new Date().toISOString(), evidence_count: evidenceResults.reduce((a: number, b: any[]) => a + b.length, 0) } });
  } catch (error) { next(error); }
};
