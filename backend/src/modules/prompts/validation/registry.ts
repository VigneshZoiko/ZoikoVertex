// ─────────────────────────────────────────────────────────────────────────────
// Validation Agent Registry
//
// The single source of truth for the six governed post-validation agents. Add
// a new agent here (and seed it in Agent Studio) — the orchestrator picks it up
// automatically. The seeded agent names in Agent Studio MUST match each agent's
// `label` so the runtime chain (agent → finding → decision) lines up with the UI.
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentKey, ValidationAgent } from './types';
import { GeneralContentAgent } from './agents/GeneralContentAgent';
import { ImageValidationAgent } from './agents/ImageValidationAgent';
import { ApprovalRulesAgent } from './agents/ApprovalRulesAgent';
import { PolicyCheckAgent } from './agents/PolicyCheckAgent';
import { EvidenceKBAgent } from './agents/EvidenceKBAgent';
import { PlatformComplianceAgent } from './agents/PlatformComplianceAgent';

export const generalContentAgent = new GeneralContentAgent();
export const imageValidationAgent = new ImageValidationAgent();
export const approvalRulesAgent = new ApprovalRulesAgent();
export const policyCheckAgent = new PolicyCheckAgent();
export const evidenceKbAgent = new EvidenceKBAgent();
export const platformComplianceAgent = new PlatformComplianceAgent();

/** All six governed validation agents. */
export const VALIDATION_AGENTS: ValidationAgent[] = [
  generalContentAgent,
  imageValidationAgent,
  approvalRulesAgent,
  policyCheckAgent,
  evidenceKbAgent,
  platformComplianceAgent,
];

export const AGENT_BY_KEY: Record<AgentKey, ValidationAgent> = {
  general_content: generalContentAgent,
  image_validation: imageValidationAgent,
  approval_rules: approvalRulesAgent,
  policy_check: policyCheckAgent,
  evidence_kb: evidenceKbAgent,
  platform_compliance: platformComplianceAgent,
};

/** Studio-facing catalog metadata for the six agents (used by the seed script). */
export const AGENT_CATALOG: Array<{ key: AgentKey; name: string; purpose: string }> = [
  {
    key: 'general_content',
    name: 'General Content Agent',
    purpose:
      'Reads the post description, heading, keywords, and hashtags to detect verifiable claims that must be substantiated before publishing.',
  },
  {
    key: 'image_validation',
    name: 'Image Validation Agent',
    purpose:
      'Scans every attached image for unsafe visual content and for blocked words appearing as text inside the image (OCR).',
  },
  {
    key: 'approval_rules',
    name: 'Approval Rules Agent',
    purpose:
      'Enforces the blocked-word keyword rules configured on the Approval Rules page against post text and image text.',
  },
  {
    key: 'policy_check',
    name: 'Policy Check Agent',
    purpose:
      'Enforces platform/system policy: blocks prohibited or unsafe content and routes regulated high-risk domains (medical, legal, financial) to review.',
  },
  {
    key: 'evidence_kb',
    name: 'Evidence / KB Agent',
    purpose:
      'Verifies detected claims against the approved Knowledge Base using semantic entailment; only genuinely supported claims pass.',
  },
  {
    key: 'platform_compliance',
    name: 'Platform Compliance Agent',
    purpose:
      'Checks caption length, hashtag count, and image count against each platform’s hard limits so posts are not rejected at publish time.',
  },
];
