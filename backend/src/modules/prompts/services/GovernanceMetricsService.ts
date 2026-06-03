import { PromptScorecardService } from '../PromptScorecardService';

interface MetricsResult {
  total_prompts: number;
  healthy_prompts: number;
  warning_prompts: number;
  critical_prompts: number;
  average_score: number;
  deploy_ready_count: number;
  tier_distribution: Record<string, number>;
  top_risks: {
    prompt_id: string;
    prompt_name: string;
    overall_score: number;
    severity: 'healthy' | 'warning' | 'critical';
  }[];
}

export class GovernanceMetricsService {
  static async compute(workspaceId: string): Promise<MetricsResult> {
    const { data: scorecards } = await PromptScorecardService.listScorecards(workspaceId, { limit: 0 });

    const total = scorecards.length;
    if (total === 0) {
      return {
        total_prompts: 0,
        healthy_prompts: 0,
        warning_prompts: 0,
        critical_prompts: 0,
        average_score: 0,
        deploy_ready_count: 0,
        tier_distribution: {},
        top_risks: [],
      };
    }

    let healthy = 0;
    let warning = 0;
    let critical = 0;
    let scoreSum = 0;
    let deployReady = 0;
    const tierDist: Record<string, number> = {};
    const risks: { prompt_id: string; prompt_name: string; overall_score: number; severity: 'healthy' | 'warning' | 'critical' }[] = [];

    for (const sc of scorecards) {
      switch (sc.overall_severity) {
        case 'healthy': healthy++; break;
        case 'warning': warning++; break;
        case 'critical': critical++; break;
      }
      scoreSum += sc.overall_score;
      if (sc.deployment_ready) deployReady++;
      const tier = sc.categories.dependency_health.details?.risk_tier as number | undefined;
      const tierKey = `tier_${tier ?? 0}`;
      tierDist[tierKey] = (tierDist[tierKey] || 0) + 1;
      risks.push({
        prompt_id: sc.prompt_id,
        prompt_name: (sc.categories.dependency_health.details?.prompt_name as string) || sc.prompt_id,
        overall_score: sc.overall_score,
        severity: sc.overall_severity,
      });
    }

    risks.sort((a, b) => a.overall_score - b.overall_score);

    return {
      total_prompts: total,
      healthy_prompts: healthy,
      warning_prompts: warning,
      critical_prompts: critical,
      average_score: Math.round((scoreSum / total) * 100) / 100,
      deploy_ready_count: deployReady,
      tier_distribution: tierDist,
      top_risks: risks.slice(0, 10),
    };
  }
}
