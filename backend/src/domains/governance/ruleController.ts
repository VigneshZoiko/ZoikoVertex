import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import * as rulesService from '../../services/approvalRules.service';
import { DEFAULT_TENANT_ID } from '../../shared/constants';
import { buildAuthContext } from '../../shared/serviceAuth';
import OpenAI from 'openai';
import { env } from '../../config/env';

function getTenantId(req: AuthRequest): string {
  return req.user?.workspace_id || DEFAULT_TENANT_ID;
}

function getUserId(req: AuthRequest): string {
  return req.user?.id || DEFAULT_TENANT_ID;
}

export const listRules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const statusStr = req.query.rule_status as string;
    const result = await rulesService.listRules({
      tenant_id: getTenantId(req),
      status: statusStr ? statusStr.split(',') : undefined,
      risk_classification: req.query.risk_classification as string,
      search: req.query.search as string,
      limit: parseInt(req.query.limit as string) || undefined,
      offset: parseInt(req.query.offset as string) || undefined,
    });
    res.json({ success: true, data: result.rules, total: result.total });
  } catch (error) { next(error); }
};

export const createRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenant_id = getTenantId(req);
    const auth = buildAuthContext(req.user);
    const rule = await rulesService.createRule({
      tenant_id,
      workspace_id: tenant_id,
      rule_name: req.body.rule_name,
      rule_description: req.body.rule_description || '',
      rule_owner_id: req.body.rule_owner_id || getUserId(req),
      rule_priority: req.body.rule_priority || 1000,
      risk_classification: req.body.risk_classification || 'LOW',
      tags: req.body.tags || [],
      keyword_rules: req.body.keyword_rules || [],
      created_by: getUserId(req),
    }, auth);
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const getRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const rule = await rulesService.getRule(id, getTenantId(req));
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    const [scopes, path, versions] = await Promise.all([
      rulesService.getRuleScope(id).catch(() => null),
      rulesService.getRulePath(id).catch(() => null),
      rulesService.getRuleVersions(id).catch(() => null),
    ]);
    const details = await rulesService.getRuleDetails(id).catch(() => null);
    res.json({ success: true, data: { ...rule, scopes, path, versions, ...(details || {}) } });
  } catch (error) { next(error); }
};

export const updateRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const auth = buildAuthContext(req.user);
    const rule = await rulesService.updateRule({
      id: req.params.id as string,
      tenant_id: getTenantId(req),
      updated_by: getUserId(req),
      ...req.body,
    }, auth);
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const submitRuleForReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const auth = buildAuthContext(req.user);
    const rule = await rulesService.submitRuleForReview(req.params.id as string, getTenantId(req), getUserId(req), auth);
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const publishRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { publish_note } = req.body;
    const auth = buildAuthContext(req.user);
    const rule = await rulesService.publishRule(req.params.id as string, getTenantId(req), getUserId(req), publish_note, auth);
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const deactivateRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const auth = buildAuthContext(req.user);
    const rule = await rulesService.deactivateRule(req.params.id as string, getTenantId(req), getUserId(req), undefined, auth);
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const reactivateRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const auth = buildAuthContext(req.user);
    const rule = await rulesService.reactivateRule(req.params.id as string, getTenantId(req), getUserId(req), auth);
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const deleteRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await rulesService.deleteRule(req.params.id as string, getTenantId(req), getUserId(req));
    res.json({ success: true });
  } catch (error) { next(error); }
};

export const archiveRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const auth = buildAuthContext(req.user);
    const rule = await rulesService.archiveRule(req.params.id as string, getTenantId(req), getUserId(req), auth);
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const cloneRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const auth = buildAuthContext(req.user);
    const rule = await rulesService.cloneRule(req.params.id as string, getTenantId(req), getTenantId(req), getUserId(req), auth);
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const getRuleScope = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scope = await rulesService.getRuleScope(req.params.id as string);
    res.json({ success: true, data: scope });
  } catch (error) { next(error); }
};

export const upsertRuleScope = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const auth = buildAuthContext(req.user);
    const scope = await rulesService.upsertRuleScope({
      approval_rule_id: req.params.id as string,
      tenant_id: getTenantId(req),
      workspace_id: getTenantId(req),
      ...req.body,
    }, auth);
    res.json({ success: true, data: scope });
  } catch (error) { next(error); }
};

export const getRulePath = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const path = await rulesService.getRulePath(req.params.id as string);
    res.json({ success: true, data: path });
  } catch (error) { next(error); }
};

export const upsertRulePath = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const auth = buildAuthContext(req.user);
    const path = await rulesService.upsertRulePath({ ...req.body, approval_rule_id: req.params.id as string }, auth);
    res.json({ success: true, data: path });
  } catch (error) { next(error); }
};

export const getRuleVersions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const versions = await rulesService.getRuleVersions(req.params.id as string);
    res.json({ success: true, data: versions });
  } catch (error) { next(error); }
};

export const getRuleAuditLog = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const logs = await rulesService.getRuleAuditLog(req.params.id as string);
    res.json({ success: true, data: logs });
  } catch (error) { next(error); }
};

export const getRuleConflicts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const conflicts = await rulesService.getRuleConflicts(req.params.id as string);
    res.json({ success: true, data: conflicts });
  } catch (error) { next(error); }
};

export const detectRuleConflicts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const auth = buildAuthContext(req.user);
    const result = await rulesService.detectRuleConflicts(req.params.id as string, getTenantId(req), auth);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const resolveRuleConflict = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const auth = buildAuthContext(req.user);
    const result = await rulesService.resolveConflict(req.params.conflictId as string, getUserId(req), auth);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const runRuleSimulation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const auth = buildAuthContext(req.user);
    const result = await rulesService.runSimulation({
      approval_rule_id: req.params.id as string,
      simulated_by: getUserId(req),
      simulation_input: req.body,
    }, auth);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const getRuleStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await rulesService.getRuleStats(getTenantId(req));
    res.json({ success: true, data: stats });
  } catch (error) { next(error); }
};

export const getRuleDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const details = await rulesService.getRuleDetails(req.params.id as string);
    res.json({ success: true, data: details });
  } catch (error) { next(error); }
};

export const getRuleStagesHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const path = await rulesService.getRulePath(req.params.id as string);
    if (!path) return res.json({ success: true, data: [] });
    const stages = await rulesService.getRuleStages((path as { id: string }).id);
    res.json({ success: true, data: stages });
  } catch (error) { next(error); }
};

export const getRuleEscalationsHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const escalations = await rulesService.getRuleEscalations(req.params.id as string);
    res.json({ success: true, data: escalations });
  } catch (error) { next(error); }
};

export const markRuleReadyToPublish = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const auth = buildAuthContext(req.user);
    const rule = await rulesService.markRuleReadyToPublish(req.params.id as string, getTenantId(req), getUserId(req), auth);
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const markRuleInvalid = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const auth = buildAuthContext(req.user);
    const rule = await rulesService.markRuleInvalid(req.params.id as string, getTenantId(req), getUserId(req), req.body.reason || 'Marked invalid by user', auth);
    res.json({ success: true, data: rule });
  } catch (error) { next(error); }
};

export const suggestKeywords = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { topic, context, existing_keywords = [], action = 'BLOCK' } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error: 'topic is required' });

    if (!env.GROQ_API_KEY) return res.status(503).json({ error: 'AI service not configured' });

    const groqClient = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: env.GROQ_API_KEY,
      timeout: 30_000,
    });

    const existingStr = (existing_keywords as string[]).length > 0
      ? `\n\nAlready in this rule (do NOT repeat): ${(existing_keywords as string[]).join(', ')}`
      : '';
    const contextStr = context?.trim() ? `\nPlatform context: ${context}` : '';
    const actionDesc = action === 'BLOCK'
      ? 'BLOCK — focus on clearly harmful, offensive, or strictly policy-violating terms.'
      : 'REQUEST_REVIEW — include borderline, sensitive, or compliance-risk terms that need human review.';

    const prompt = `You are a content moderation expert for an enterprise social media governance platform.

Generate a comprehensive keyword list for automated content filtering.

Topic to generate keywords for: "${topic}"${contextStr}
Action type: ${actionDesc}
${existingStr}

Requirements:
- Up to 30 unique, lowercase keywords or short phrases
- Include: direct terms, common misspellings, slang, abbreviations, leet-speak variants, 2-3 word phrases
- Cover regional/cultural variants where relevant
- Be smart and comprehensive — think how real people write this content online
- Exclude any already-existing keywords listed above

Return ONLY a valid JSON array with no explanation:
["keyword1", "keyword2", ...]`;

    const completion = await groqClient.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content || '[]';
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let keywords: string[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      keywords = Array.isArray(parsed)
        ? parsed.map((k: any) => String(k).toLowerCase().trim()).filter(Boolean)
        : [];
    } catch {
      keywords = cleaned.replace(/["\[\]]/g, '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    }

    const unique = [...new Set(keywords)].slice(0, 30);
    res.json({ success: true, keywords: unique, count: unique.length });
  } catch (error) {
    next(error);
  }
};
