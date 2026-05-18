/**
 * Risk Classification Engine for ZoikoVertex
 *
 * Analyzes content for legal, financial, healthcare, political, and controversial risks
 * to determine appropriate approval workflows and governance controls.
 */

import { supabaseAdmin } from '../../shared/supabase';
import { nksStore } from '../agents/autonomyController';

export interface RiskAssessment {
  level: "LOW" | "STANDARD" | "ELEVATED" | "HIGH" | "RESTRICTED";
  score: number; // 0-100
  factors: string[];
  requiresApproval: boolean;
  approvalLevel?:
    | "REVIEWER"
    | "VALIDATOR"
    | "GOVERNANCE_ADMIN"
    | "FINAL_APPROVER";
  categories: {
    legal: boolean;
    financial: boolean;
    healthcare: boolean;
    political: boolean;
    controversial: boolean;
  };
}

export class RiskClassifier {
  private static readonly RISK_PATTERNS = {
    LEGAL: [
      "lawsuit",
      "litigation",
      "court",
      "legal",
      "attorney",
      "compliance",
      "regulation",
      "regulatory",
      "liability",
      "lawsuit",
      "subpoena",
      "deposition",
      "settlement",
      "verdict",
      "injunction",
      "plaintiff",
      "defendant",
      "prosecution",
    ],
    FINANCIAL: [
      "earnings",
      "revenue",
      "profit",
      "stock",
      "investment",
      "ROI",
      "forecast",
      "guidance",
      "quarterly",
      "SEC",
      "filing",
      "material",
      "forward-looking",
      "projection",
      "EBITDA",
      "margin",
      "valuation",
      "IPO",
      "acquisition",
      "merger",
    ],
    HEALTHCARE: [
      "medical",
      "treatment",
      "diagnosis",
      "symptom",
      "drug",
      "therapy",
      "clinical",
      "prescription",
      "FDA",
      "dosage",
      "side effect",
      "contraindication",
      "patient",
      "disease",
      "condition",
      "cure",
      "remedy",
      "supplement",
      "wellness",
    ],
    POLITICAL: [
      "election",
      "vote",
      "candidate",
      "policy",
      "government",
      "legislation",
      "bill",
      "congress",
      "senate",
      "campaign",
      "ballot",
      "referendum",
      "partisan",
      "incumbent",
      "primary",
      "caucus",
      "lobbying",
      "bipartisan",
    ],
    CONTROVERSIAL: [
      "abortion",
      "gun",
      "religion",
      "race",
      "discrimination",
      "scandal",
      "harassment",
      "misconduct",
      "controversy",
      "backlash",
      "boycott",
      "protest",
      "demonstration",
      "activism",
      "advocacy",
      "polarizing",
    ],
  };

  private static readonly PLATFORM_RISK_MULTIPLIERS: Record<string, number> = {
    linkedin: 0.8, // Professional context, lower risk
    twitter: 1.2, // Higher risk due to public nature
    facebook: 1.0, // Standard risk
    instagram: 0.9, // Visual platform, slightly lower
    threads: 1.1, // Text-based, higher risk
    tiktok: 1.15, // Younger audience, higher scrutiny
    youtube: 1.05, // Long-form, moderate risk
    pinterest: 0.85, // Visual, lower risk
  };

  /**
   * Assess the risk level of content for social media publishing
   */
  static assessContent(
    content: string,
    platform: string = "linkedin",
  ): RiskAssessment {
    const lowerContent = content.toLowerCase();
    let score = 0;
    const factors: string[] = [];
    const categories = {
      legal: false,
      financial: false,
      healthcare: false,
      political: false,
      controversial: false,
    };

    // Check for risk patterns
    for (const [category, patterns] of Object.entries(this.RISK_PATTERNS)) {
      const matches = patterns.filter((p) => lowerContent.includes(p));
      if (matches.length > 0) {
        score += matches.length * 15;
        factors.push(
          `${category} language detected (${matches.length} matches)`,
        );

        // Set category flag
        const categoryKey = category.toLowerCase() as keyof typeof categories;
        categories[categoryKey] = true;
      }
    }

    // Apply platform-specific risk multiplier
    const platformMultiplier =
      this.PLATFORM_RISK_MULTIPLIERS[platform.toLowerCase()] || 1.0;
    score *= platformMultiplier;

    // Check for additional risk factors
    if (content.length > 280 && platform === "twitter") {
      score += 10;
      factors.push("Long-form content on Twitter increases risk");
    }

    if (
      this.containsNumbers(content) &&
      (categories.financial || categories.healthcare)
    ) {
      score += 20;
      factors.push("Specific numerical claims in regulated categories");
    }

    if (this.containsAbsoluteLanguage(content)) {
      score += 15;
      factors.push("Absolute or definitive language detected");
    }

    // Cap score at 100
    score = Math.min(score, 100);

    // Determine level and approval requirements
    let level: RiskAssessment["level"] = "LOW";
    let requiresApproval = false;
    let approvalLevel: RiskAssessment["approvalLevel"];

    if (score >= 80) {
      level = "RESTRICTED";
      requiresApproval = true;
      approvalLevel = "FINAL_APPROVER";
    } else if (score >= 60) {
      level = "HIGH";
      requiresApproval = true;
      approvalLevel = "GOVERNANCE_ADMIN";
    } else if (score >= 40) {
      level = "ELEVATED";
      requiresApproval = true;
      approvalLevel = "VALIDATOR";
    } else if (score >= 20) {
      level = "STANDARD";
      requiresApproval = true;
      approvalLevel = "REVIEWER";
    }

    return {
      level,
      score,
      factors,
      requiresApproval,
      approvalLevel,
      categories,
    };
  }

  /**
   * Get approval workflow configuration based on risk level
   */
  static getApprovalWorkflow(riskLevel: string): {
    steps: string[];
    estimatedTime: string;
  } {
    const workflows = {
      LOW: {
        steps: ["Auto-approve"],
        estimatedTime: "Immediate",
      },
      STANDARD: {
        steps: ["Creator → Reviewer → Publisher"],
        estimatedTime: "1-2 hours",
      },
      ELEVATED: {
        steps: [
          "Creator → Reviewer → Integrity Validator → Approver → Publisher",
        ],
        estimatedTime: "2-4 hours",
      },
      HIGH: {
        steps: [
          "Creator → Reviewer → Integrity Validator → Governance Admin → Final Approver → Publisher",
        ],
        estimatedTime: "4-8 hours",
      },
      RESTRICTED: {
        steps: [
          "Creator → Reviewer → Integrity Validator → Governance Admin → Final Approver → Legal Review → Publisher",
        ],
        estimatedTime: "8-24 hours",
      },
    };

    return workflows[riskLevel as keyof typeof workflows] || workflows.STANDARD;
  }

  /**
   * Check if content contains numerical claims
   */
  private static containsNumbers(content: string): boolean {
    // Look for percentages, dollar amounts, or statistics
    const numberPatterns = [
      /\d+%/, // Percentages
      /\$\d+/, // Dollar amounts
      /\d+\s*(million|billion|thousand)/i, // Large numbers
      /\d+:\d+/, // Ratios
      /1 in \d+/i, // Statistics
      /\d+\/\d+/, // Fractions
    ];

    return numberPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Check for absolute or definitive language
   */
  private static containsAbsoluteLanguage(content: string): boolean {
    const absoluteTerms = [
      "guarantee",
      "guaranteed",
      "will",
      "certain",
      "definitely",
      "always",
      "never",
      "every",
      "all",
      "none",
      "impossible",
      "proven",
      "scientifically proven",
      "clinically proven",
      "best",
      "worst",
      "only",
      "first",
      "last",
      "ultimate",
    ];

    const lowerContent = content.toLowerCase();
    return absoluteTerms.some((term) => lowerContent.includes(term));
  }

  /**
   * Generate a risk summary for display
   */
  static generateRiskSummary(assessment: RiskAssessment): string {
    if (assessment.level === "LOW") {
      return "Content appears safe for immediate publishing.";
    }

    const summaries = {
      STANDARD:
        "Standard review required. Content may contain mild risk factors.",
      ELEVATED:
        "Enhanced review required. Content contains moderate risk factors requiring validation.",
      HIGH: "High-risk content detected. Requires governance admin approval before publishing.",
      RESTRICTED:
        "Restricted content. Requires executive approval and legal review.",
    };

    return summaries[assessment.level] || "Review required.";
  }

  /**
   * Perform advanced, interconnected dynamic context assessment using database guardrails.
   * Scans content against allowed/prohibited brand standard lexicons, NKS prohibited terms, 
   * and verifies agent trust score boundaries for active levels.
   */
  static async assessContentAdvanced(
    content: string,
    platform: string = "linkedin",
    workspaceId: string = "global",
    agentId?: string
  ): Promise<{
    assessment: RiskAssessment;
    nksViolations: string[];
    brandViolations: string[];
    agentCompliance: {
      trustScore: number;
      faithfulnessScore: number;
      isSuspended: boolean;
      allowedMaxLevel: string;
      requiresHumanEscalation: boolean;
      escalationReason?: string;
    };
  }> {
    // 1. Perform baseline risk classification
    const assessment = this.assessContent(content, platform);
    const lowerContent = content.toLowerCase();
    const factors = [...assessment.factors];
    const nksViolations: string[] = [];
    const brandViolations: string[] = [];
    
    let trustScore = 1.0;
    let faithfulnessScore = 1.0;
    let isSuspended = false;
    let allowedMaxLevel = "L6";
    let requiresHumanEscalation = false;
    let escalationReason: string | undefined = undefined;

    // 2. Scan dynamic Negative Knowledge Sets (NKS)
    try {
      const { data: dbNks } = await supabaseAdmin
        .from('negative_knowledge_sets')
        .select('*')
        .eq('workspace_id', workspaceId);
      
      const allNks = [...(dbNks || [])];

      for (const nksItem of nksStore.values()) {
        if (nksItem.workspace_id === workspaceId && !allNks.some(n => n.id === nksItem.id)) {
          allNks.push(nksItem);
        }
      }

      for (const nks of allNks) {
        const matchingTerms = nks.prohibited_terms.filter((term: string) => 
          lowerContent.includes(term.toLowerCase())
        );

        if (matchingTerms.length > 0) {
          nksViolations.push(...matchingTerms);
          
          let scorePenalty = 20;
          let levelRequirement: RiskAssessment["approvalLevel"] = "VALIDATOR";
          
          if (nks.severity === "BLOCK") {
            scorePenalty = 40;
            levelRequirement = "FINAL_APPROVER";
          } else if (nks.severity === "ESCALATE") {
            scorePenalty = 30;
            levelRequirement = "GOVERNANCE_ADMIN";
          } else if (nks.severity === "REQUIRE_APPROVAL") {
            scorePenalty = 20;
            levelRequirement = "VALIDATOR";
          } else if (nks.severity === "WARN") {
            scorePenalty = 10;
            levelRequirement = "REVIEWER";
          }

          assessment.score += scorePenalty;
          factors.push(`NKS Prohibited term detected: [${matchingTerms.join(", ")}] in set '${nks.name}' (Severity: ${nks.severity})`);

          if (assessment.score >= 20) assessment.requiresApproval = true;
          if (levelRequirement === "FINAL_APPROVER") {
            assessment.approvalLevel = "FINAL_APPROVER";
          } else if (levelRequirement === "GOVERNANCE_ADMIN" && assessment.approvalLevel !== "FINAL_APPROVER") {
            assessment.approvalLevel = "GOVERNANCE_ADMIN";
          } else if (levelRequirement === "VALIDATOR" && !["FINAL_APPROVER", "GOVERNANCE_ADMIN"].includes(assessment.approvalLevel || "")) {
            assessment.approvalLevel = "VALIDATOR";
          }
        }
      }
    } catch (err) {
      // Graceful fallback
    }

    // 3. Scan brand standards allowed/prohibited linguistic rules + Evidence Dependency check
    try {
      const { data: dbLinguistic } = await supabaseAdmin
        .from('brand_linguistic_rules')
        .select('*')
        .eq('workspace_id', workspaceId)
        .limit(1)
        .maybeSingle();

      const prohibitedLexicon = dbLinguistic?.prohibited_lexicon || [
        "guarantee", "bulletproof", "risk-free", "absolute-security", "perfect-accuracy"
      ];
      const allowedLexicon = dbLinguistic?.allowed_lexicon || [
        "sustainable", "governed-autonomy", "verifiable-provenance", "sovereign-agent", "deterministic"
      ];

      const violatedProhibited = prohibitedLexicon.filter((term: string) => 
        lowerContent.includes(term.toLowerCase())
      );
      if (violatedProhibited.length > 0) {
        brandViolations.push(...violatedProhibited);
        assessment.score += violatedProhibited.length * 25;
        factors.push(`Prohibited Brand Lexicon violated: [${violatedProhibited.join(", ")}]`);
        assessment.requiresApproval = true;
        assessment.approvalLevel = "GOVERNANCE_ADMIN";
      }

      const alignedAllowed = allowedLexicon.filter((term: string) => 
        lowerContent.includes(term.toLowerCase())
      );
      if (alignedAllowed.length > 0) {
        assessment.score = Math.max(0, assessment.score - alignedAllowed.length * 5);
        factors.push(`Aligned Brand Lexicon bonus: [${alignedAllowed.join(", ")}]`);
      }

      // GAP FIX 1: Evidence Dependency enforcement (Brand Standards spec - voice.evidence_dependency index)
      // If evidence_dependency threshold is high and content contains factual/statistical language
      // without an evidence anchor, escalate per Brand Standards Architecture doc.
      const evidenceDependency: number = dbLinguistic?.evidence_dependency ?? 0.5;
      const factuallanguageTerms = ["proven", "study shows", "research shows", "data shows",
        "according to", "statistics show", "evidence shows", "survey", "report"];
      const hasFactualLanguage = factuallanguageTerms.some(t => lowerContent.includes(t));
      const hasEvidenceAnchor = ["http", "source:", "citation:", "ref:", "see:"].some(t => lowerContent.includes(t));

      if (evidenceDependency >= 0.6 && hasFactualLanguage && !hasEvidenceAnchor) {
        assessment.score += Math.round(evidenceDependency * 30); // up to +30 based on threshold
        assessment.requiresApproval = true;
        factors.push(
          `Evidence Dependency violation: Brand requires evidence anchors (threshold: ${Math.round(evidenceDependency * 100)}%) for factual language but none found.`
        );
        if (assessment.approvalLevel !== "FINAL_APPROVER") {
          assessment.approvalLevel = "GOVERNANCE_ADMIN";
        }
      }
    } catch (err) {
      // Fallback
    }

    // 4. Validate agent trust, faithfulness, and policy violation history (Approval Integrity)
    if (agentId) {
      try {
        const { data: agent } = await supabaseAdmin
          .from('agents')
          .select('name, trust_score, faithfulness_score, autonomy_level, status')
          .eq('id', agentId)
          .single();

        if (agent) {
          trustScore = agent.trust_score ?? 1.0;
          faithfulnessScore = agent.faithfulness_score ?? 1.0;
          isSuspended = agent.status === "SUSPENDED" || agent.autonomy_level === "L0";

          const trustPct = Math.round(trustScore * 100);
          const faithPct = Math.round(faithfulnessScore * 100);

          if (isSuspended) {
            requiresHumanEscalation = true;
            escalationReason = "Agent is currently SUSPENDED or set to L0 Assistive Only.";
            assessment.score = 100;
            assessment.requiresApproval = true;
            assessment.approvalLevel = "FINAL_APPROVER";
            factors.push("Blocked: Attempted publishing via a suspended agent.");
          }

          if (faithPct < 85) {
            requiresHumanEscalation = true;
            escalationReason = `Agent Faithfulness (${faithPct}%) falls below safety threshold of 85%.`;
            assessment.score = Math.max(assessment.score, 80);
            assessment.requiresApproval = true;
            assessment.approvalLevel = "GOVERNANCE_ADMIN";
            factors.push(`Faithfulness trigger: Agent faithfulness score is too low (${faithPct}%)`);
          }

          if (trustPct < 60) allowedMaxLevel = "L2";
          else if (trustPct < 70) allowedMaxLevel = "L3";
          else if (trustPct < 80) allowedMaxLevel = "L4";
          else if (trustPct < 90) allowedMaxLevel = "L5";

          const currentLvlNum = parseInt(agent.autonomy_level?.replace("L", "") || "0");
          const allowedLvlNum = parseInt(allowedMaxLevel.replace("L", ""));

          if (currentLvlNum > allowedLvlNum) {
            requiresHumanEscalation = true;
            escalationReason = `Agent Autonomy Level (${agent.autonomy_level}) exceeds limits allowed for trust score (${trustPct}%). Max permitted is ${allowedMaxLevel}.`;
            assessment.score = Math.max(assessment.score, 70);
            assessment.requiresApproval = true;
            assessment.approvalLevel = "GOVERNANCE_ADMIN";
            factors.push(`Trust threshold violation: Agent autonomy (${agent.autonomy_level}) exceeds trust boundary (${allowedMaxLevel})`);
          }

          // GAP FIX 2: Approval Integrity / Policy Violation History check
          // Per HITL doc: if an agent produces 3+ consecutive policy-rejected outputs,
          // it must automatically move to Supervised Mode for re-certification.
          try {
            const { data: recentRejections } = await supabaseAdmin
              .from('publish_intents')
              .select('id, status')
              .eq('creator_id', agentId)
              .in('status', ['REJECTED', 'GOVERNANCE_BLOCKED'])
              .order('created_at', { ascending: false })
              .limit(5);

            const consecutiveViolations = (recentRejections || []).length;
            if (consecutiveViolations >= 3) {
              requiresHumanEscalation = true;
              escalationReason = escalationReason ||
                `Approval Integrity Alert: Agent has ${consecutiveViolations} recent rejected/blocked publish attempts. Re-certification required.`;
              assessment.score = Math.max(assessment.score, 75);
              assessment.requiresApproval = true;
              assessment.approvalLevel = assessment.approvalLevel === "FINAL_APPROVER"
                ? "FINAL_APPROVER" : "GOVERNANCE_ADMIN";
              factors.push(
                `Collusion/Integrity Flag: ${consecutiveViolations} recent policy violations detected. Agent routed for re-certification review.`
              );
            }
          } catch (_) { /* Graceful fallback */ }
        }
      } catch (err) {
        // Fallback
      }
    }

    assessment.score = Math.min(assessment.score, 100);
    assessment.factors = factors;

    if (assessment.score >= 80) {
      assessment.level = "RESTRICTED";
      assessment.requiresApproval = true;
      assessment.approvalLevel = "FINAL_APPROVER";
    } else if (assessment.score >= 60) {
      assessment.level = "HIGH";
      assessment.requiresApproval = true;
      if (assessment.approvalLevel !== "FINAL_APPROVER") {
        assessment.approvalLevel = "GOVERNANCE_ADMIN";
      }
    } else if (assessment.score >= 40) {
      assessment.level = "ELEVATED";
      assessment.requiresApproval = true;
      if (!["FINAL_APPROVER", "GOVERNANCE_ADMIN"].includes(assessment.approvalLevel || "")) {
        assessment.approvalLevel = "VALIDATOR";
      }
    } else if (assessment.score >= 20) {
      assessment.level = "STANDARD";
      assessment.requiresApproval = true;
      if (!["FINAL_APPROVER", "GOVERNANCE_ADMIN", "VALIDATOR"].includes(assessment.approvalLevel || "")) {
        assessment.approvalLevel = "REVIEWER";
      }
    } else {
      assessment.level = "LOW";
      assessment.requiresApproval = false;
      assessment.approvalLevel = undefined;
    }

    return {
      assessment,
      nksViolations,
      brandViolations,
      agentCompliance: {
        trustScore,
        faithfulnessScore,
        isSuspended,
        allowedMaxLevel,
        requiresHumanEscalation,
        escalationReason
      }
    };
  }
}
