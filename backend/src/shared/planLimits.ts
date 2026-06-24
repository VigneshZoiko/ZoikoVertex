import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

export interface PlanLimit {
  maxKeys: number;            // 0 = blocked, -1 = unlimited
  maxWebhooks: number;        // 0 = blocked, -1 = unlimited
  reqPerMin: number;          // general API rate limit for API key users
  aiPerMin: number;           // AI/QA route rate limit for API key users
  allowWildcard: boolean;
  aiTokensMonthly: number;    // monthly AI token quota; -1 = unlimited
  aiOverageRatePerK: number;  // USD per 1,000 tokens over quota (0 = no overage billing)
  storageGbIncluded: number;  // base storage in GB; -1 = unlimited
}

// Per-plan limits — matches DB plan_type values: FREE | STARTER | GROWTH | SCALE | ENTERPRISE
export const PLAN_LIMITS: Record<string, PlanLimit> = {
  FREE:       { maxKeys: 0,  maxWebhooks: 0,  reqPerMin: 0,   aiPerMin: 0,  allowWildcard: false, aiTokensMonthly: 10_000,    aiOverageRatePerK: 0,     storageGbIncluded: 0.5   },
  STARTER:    { maxKeys: 3,  maxWebhooks: 2,  reqPerMin: 30,  aiPerMin: 5,  allowWildcard: false, aiTokensMonthly: 100_000,   aiOverageRatePerK: 0.005, storageGbIncluded: 1     },
  GROWTH:     { maxKeys: 10, maxWebhooks: 5,  reqPerMin: 100, aiPerMin: 20, allowWildcard: false, aiTokensMonthly: 500_000,   aiOverageRatePerK: 0.004, storageGbIncluded: 30    },
  SCALE:      { maxKeys: 50, maxWebhooks: 20, reqPerMin: 200, aiPerMin: 40, allowWildcard: false, aiTokensMonthly: 2_000_000, aiOverageRatePerK: 0.003, storageGbIncluded: 75    },
  ENTERPRISE: { maxKeys: -1, maxWebhooks: -1, reqPerMin: 400, aiPerMin: 80, allowWildcard: true,  aiTokensMonthly: -1,        aiOverageRatePerK: 0.002, storageGbIncluded: -1    },
};

// Storage add-on packs — price includes 75% markup over Supabase cost ($0.40/GB)
export const STORAGE_ADDON_PACKS: { gb: number; priceUsd: number }[] = [
  { gb: 5,  priceUsd: 3.50  },
  { gb: 15, priceUsd: 10.50 },
  { gb: 30, priceUsd: 21.00 },
  { gb: 50, priceUsd: 35.00 },
];

const ALLOWED_PLANS    = ['GROWTH', 'SCALE', 'ENTERPRISE'];

// Block API key users from integration management — dashboard only
export const blockApiKeyUsers = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.api_key_id) {
    return res.status(403).json({
      error: 'Forbidden: API key management requires dashboard login',
    });
  }
  next();
};

// Block FREE / STARTER workspaces from API & Webhooks section (per Plan Access Architecture doc)
export const integrationPlanGate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const plan = (req.user?.workspace_plan ?? 'FREE').toUpperCase();
  if (!ALLOWED_PLANS.includes(plan)) {
    return res.status(403).json({
      error: 'API & Webhooks requires Growth plan or higher',
      current_plan: plan.toLowerCase(),
      upgrade_required: true,
    });
  }
  next();
};

// ─── In-memory rate limiter for API key requests ─────────────────────────────
// Only activates for req.user.api_key_id — JWT dashboard users always bypass.
// Uses a sliding 60-second window per key+type bucket.

interface RateBucket { count: number; resetAt: number }
const _store = new Map<string, RateBucket>();

// Clean expired buckets every minute to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of _store) {
    if (bucket.resetAt < now) _store.delete(key);
  }
}, 60_000).unref();

export function planRateLimit(type: 'general' | 'ai') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user?.api_key_id) { next(); return; } // JWT users bypass

    const plan   = (req.user.workspace_plan ?? 'FREE').toUpperCase();
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
    const max    = type === 'ai' ? limits.aiPerMin : limits.reqPerMin;

    if (max <= 0) {
      res.status(403).json({
        error: 'API access is not available on your current plan',
        current_plan: plan.toLowerCase(),
        upgrade_required: true,
      });
      return;
    }

    // max === -1 means unlimited (Enterprise with no cap)
    if (max === -1) { next(); return; }

    const bucketKey = `${req.user.api_key_id}:${type}`;
    const now       = Date.now();
    let bucket      = _store.get(bucketKey);

    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + 60_000 };
      _store.set(bucketKey, bucket);
    }
    // Skip duplicate-count for the first request (count === 0 → this is #1)
    if (bucket.count > 0) {
      bucket.count++;
    } else {
      bucket.count = 1;
    }

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > max) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        limit: max,
        window: '60s',
        reset_at: new Date(bucket.resetAt).toISOString(),
        upgrade_message: 'Upgrade your plan for higher rate limits',
      });
      return;
    }

    next();
  };
}
