/**
 * Risk Classification Engine for ZoikoVertex
 *
 * Analyzes content for legal, financial, healthcare, political, and controversial risks
 * to determine appropriate approval workflows and governance controls.
 */

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
}
