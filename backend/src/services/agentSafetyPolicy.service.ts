import { supabaseAdmin } from '../shared/supabase';
import { logToDatabase } from '../shared/databaseLogger';
import { moderate } from '../modules/safety/moderationService';
import type { SafetyCategory } from '../modules/safety/types';

const SERVICE = 'AgentSafetyPolicy';

// ============================================================
// Legacy public API — preserved verbatim. The runtime behavior
// now delegates to the production safety engine in
// `src/modules/safety/`. Caller contracts (SAFETY_TEST_SUITE,
// DetectionCategory, SafetyPolicyResult) are unchanged so the
// existing route handlers and tests continue to compile and
// behave identically from the outside.
// ============================================================

export const DETECTION_CATEGORIES = [
  'offensive_language',
  'hate_harassment',
  'sexual_content',
  'violence_self_harm',
  'regulated_claims',
  'competitor_risk',
  'confidential_data_leakage',
  'brand_drift',
  'unsupported_claims',
  'policy_drift',
  'hallucination',
] as const;

export type DetectionCategory = typeof DETECTION_CATEGORIES[number];

export interface SafetyPolicyResult {
  id?: string;
  agent_id: string;
  test_id?: string;
  policy_id?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  pass_fail: boolean;
  blocked_terms: string[];
  platform?: string;
  evidence_id?: string;
  reviewer_notes?: string;
  category: DetectionCategory;
  details?: Record<string, unknown>;
}

// ------------------------------------------------------------
// Legacy category → modern category buckets. The legacy API
// collapses some categories the new engine treats separately
// (e.g. hate_harassment splits into hate_speech + harassment;
// violence_self_harm splits into violence + self_harm).
// ------------------------------------------------------------
const LEGACY_TO_MODERN: Record<DetectionCategory, SafetyCategory[]> = {
  offensive_language: ['offensive_language'],
  hate_harassment: ['hate_speech', 'harassment'],
  sexual_content: ['sexual_content'],
  violence_self_harm: ['violence', 'self_harm'],
  regulated_claims: ['regulated_claims'],
  competitor_risk: ['competitor_risk'],
  confidential_data_leakage: ['confidential_data_leakage'],
  // The four below are not currently covered by the deterministic engine.
  // The Gemini fallback inside `moderate()` will still surface semantic
  // signals when applicable, but the legacy bucket simply receives an
  // empty match list from the modern engine.
  brand_drift: [],
  unsupported_claims: [],
  policy_drift: [],
  hallucination: [],
};

export async function runSafetyCheck(
  agentId: string,
  category: DetectionCategory,
  content: string,
): Promise<SafetyPolicyResult> {
  // Run the full moderation pipeline once; downstream we filter by
  // the legacy category bucket the caller asked about.
  const verdict = await moderate({ content, subjectId: agentId });

  const targetCategories = new Set<SafetyCategory>(LEGACY_TO_MODERN[category]);
  const relevant = verdict.matches.filter((m) => targetCategories.has(m.category));

  const blocked_terms = Array.from(
    new Set(relevant.map((m) => (m.pattern === '<semantic>' ? m.matchedText : m.pattern))),
  );
  const pass_fail = relevant.length === 0;

  // Severity uses the worst relevant-match severity (not the global
  // verdict severity, which could be elevated by another category).
  const severityRank = { low: 1, medium: 2, high: 3, critical: 4 } as const;
  const severity = relevant.length
    ? (relevant.reduce<keyof typeof severityRank>(
        (acc, m) => (severityRank[m.severity] > severityRank[acc] ? m.severity : acc),
        'low',
      ))
    : 'low';

  const result: SafetyPolicyResult = {
    agent_id: agentId,
    severity,
    pass_fail,
    blocked_terms,
    evidence_id: verdict.evidenceId,
    category,
    details: {
      verdict: verdict.verdict,
      overallRisk: verdict.overallRisk,
      source: verdict.source,
      modelUsed: verdict.modelUsed,
    },
  };

  try {
    await supabaseAdmin.from('agent_safety_policy_results').insert([
      {
        agent_id: agentId,
        severity,
        pass_fail,
        blocked_terms,
        evidence_id: verdict.evidenceId,
      },
    ]);
  } catch (err) {
    await logToDatabase('warn', SERVICE, 'Could not persist safety check', { agentId, err });
  }

  return result;
}

export async function getSafetyResults(agentId: string): Promise<SafetyPolicyResult[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_safety_policy_results')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as SafetyPolicyResult[];
  } catch {
    return [];
  }
}

export const SAFETY_TEST_SUITE = [
  { category: 'offensive_language' as DetectionCategory, name: 'Offensive Language Detection' },
  { category: 'hate_harassment' as DetectionCategory, name: 'Hate & Harassment Detection' },
  { category: 'sexual_content' as DetectionCategory, name: 'Sexual Content Detection' },
  { category: 'violence_self_harm' as DetectionCategory, name: 'Violence & Self-Harm Detection' },
  { category: 'regulated_claims' as DetectionCategory, name: 'Regulated Claims Detection' },
  { category: 'competitor_risk' as DetectionCategory, name: 'Competitor Risk Detection' },
  { category: 'confidential_data_leakage' as DetectionCategory, name: 'Confidential Data Leakage Detection' },
];
