"use client";

import { useMemo } from "react";
import { useRoleContext } from "@/lib/context/RoleContext";
import {
  type Plan,
  type Feature,
  PLAN_RANK,
  PLAN_DISPLAY,
  PLAN_BADGE_COLOR,
  FEATURE_MIN_PLAN,
  FEATURE_UPGRADE_REASON,
  normalisePlan,
  canUsePlan,
} from "@/lib/planFeatures";

export interface PlanContext {
  plan: Plan;
  planRank: number;
  planLabel: string;
  planBadgeColor: string;
  canUse: (feature: Feature) => boolean;
  minPlanFor: (feature: Feature) => Plan;
  minPlanLabelFor: (feature: Feature) => string;
  upgradeReasonFor: (feature: Feature) => string;
}

export function usePlan(): PlanContext {
  const { planType, isSuperAdmin } = useRoleContext();

  return useMemo<PlanContext>(() => {
    // Superadmin always gets full access regardless of stored plan
    const plan: Plan = isSuperAdmin ? 'ENTERPRISE' : normalisePlan(planType);

    return {
      plan,
      planRank:         PLAN_RANK[plan],
      planLabel:        PLAN_DISPLAY[plan],
      planBadgeColor:   PLAN_BADGE_COLOR[plan],
      canUse:           (f: Feature) => isSuperAdmin || canUsePlan(plan, f),
      minPlanFor:       (f: Feature) => FEATURE_MIN_PLAN[f],
      minPlanLabelFor:  (f: Feature) => PLAN_DISPLAY[FEATURE_MIN_PLAN[f]],
      upgradeReasonFor: (f: Feature) => FEATURE_UPGRADE_REASON[f],
    };
  }, [planType, isSuperAdmin]);
}
