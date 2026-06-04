  /* eslint-disable @typescript-eslint/no-explicit-any */
  // ─────────────────────────────────────────────────────────────────────────────
  // DependencyHealthService
  //
  // Batch 3B.5 — the dependency health classification engine from the approved
  // Batch 3B architecture plan. PURE and reusable: it classifies a dependency
  // node/edge from metadata you pass in. It performs NO database, controller, or
  // route access, so it can be reused by the (later) Dependency Graph, Impact
  // Analysis, Reverse Traversal, and Deployment Governance layers.
  //
  // Health model (Doc 3 §8/§13, Doc 2 §9). Output shape complements the existing
  // workflowDependency.service.ts `DependencyHealth` rollup pattern; summarize()
  // produces an equivalent per-type rollup.
  // ─────────────────────────────────────────────────────────────────────────────

  export type DependencyHealthStatus =
    | 'HEALTHY'
    | 'WARNING'
    | 'STALE'
    | 'EXPIRED'
    | 'REVOKED'
    | 'MISSING'
    | 'PAUSED'
    | 'ARCHIVED'
    | 'DELETED';

  export type DependencySeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';

  /** A dependency node/edge to classify. All fields optional except presence is inferred. */
  export interface DependencyInput {
    type: string;                      // agent | workflow | workflow_node | knowledge | tool | channel | brand | policy
    id?: string | null;
    /** Whether the target row was resolved. false / undefined-with-id ⇒ MISSING. */
    exists?: boolean;
    /** Target lifecycle status: active, paused, suspended, degraded, archived, retired, deleted, revoked, expired … */
    status?: string | null;
    effective_from?: string | null;
    effective_to?: string | null;
    expiry_date?: string | null;       // knowledge expiry
    review_date?: string | null;       // freshness / review-due date
    freshness_rule?: string | null;    // e.g. "30d", "12h", "2w", "6mo", or a plain number of days
    last_updated_at?: string | null;   // basis for freshness window
    retrieval_mode?: string | null;    // optional | mandatory | blocked | fallback
  }

  export interface DependencyHealthResult {
    type: string;
    id: string | null;
    status: DependencyHealthStatus;
    severity: DependencySeverity;
    blocking: boolean;
    reason: string;
    recommendations: string[];
  }

  export interface DependencyHealthSummary {
    total: number;
    by_status: Record<string, number>;
    blocking_count: number;
    blocked: boolean;
    highest_severity: DependencySeverity;
    // workflowDependency.service.ts-compatible rollup
    rollup: Array<{ dependency_type: string; status: DependencyHealthStatus; severity: DependencySeverity; blocking: boolean; count: number }>;
  }

  const SEVERITY_BY_STATUS: Record<DependencyHealthStatus, DependencySeverity> = {
    HEALTHY: 'none',
    WARNING: 'low',
    STALE: 'medium',
    PAUSED: 'medium',
    ARCHIVED: 'medium',
    EXPIRED: 'high',
    REVOKED: 'high',
    MISSING: 'critical',
    DELETED: 'critical',
  };

  const SEVERITY_ORDER: DependencySeverity[] = ['none', 'low', 'medium', 'high', 'critical'];

  // Per the Batch 3B.5 blocking rules: MISSING / DELETED / REVOKED / EXPIRED
  // always block; STALE blocks only when retrieval is mandatory; everything else
  // (HEALTHY, WARNING, PAUSED, ARCHIVED) is non-blocking.
  const ALWAYS_BLOCKING = new Set<DependencyHealthStatus>(['MISSING', 'DELETED', 'REVOKED', 'EXPIRED']);

  const RECOMMENDATIONS: Record<DependencyHealthStatus, string[]> = {
    HEALTHY: [],
    WARNING: ['Review before it expires or goes stale.'],
    STALE: ['Re-review the source and refresh it, or update the freshness window.'],
    EXPIRED: ['Renew or replace the dependency, then re-approve the prompt version.'],
    REVOKED: ['Restore access or remove the binding; re-approval is required after the change.'],
    MISSING: ['The target no longer resolves — repoint or remove this binding before deployment.'],
    PAUSED: ['Resume the target, or hold dependent auto-publish until it is active.'],
    ARCHIVED: ['Replace the archived target with an active one before relying on it.'],
    DELETED: ['The target was deleted — remove or repoint this binding immediately.'],
  };

  function parseDate(value?: string | null): number | null {
    if (!value) return null;
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : null;
  }

  /** Parse a freshness rule ("30d", "12h", "2w", "6mo", or "30") into milliseconds. */
  function parseFreshnessMs(rule?: string | null): number | null {
    if (!rule) return null;
    const m = String(rule).trim().toLowerCase().match(/^(\d+)\s*(mo|w|d|h|m)?$/);
    if (!m) return null;
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n <= 0) return null;
    const unit = m[2] || 'd';
    const MS = { h: 3600e3, d: 86400e3, w: 604800e3, mo: 2592000e3, m: 2592000e3 } as Record<string, number>;
    return n * (MS[unit] ?? MS.d);
  }

  const WARNING_WINDOW_MS = 7 * 86400e3; // surface upcoming expiry/review within 7 days

  export class DependencyHealthService {
    /** Severity for a given health status. */
    static getSeverity(status: DependencyHealthStatus): DependencySeverity {
      return SEVERITY_BY_STATUS[status] ?? 'medium';
    }

    private static isBlocking(status: DependencyHealthStatus, retrievalMode?: string | null): boolean {
      if (ALWAYS_BLOCKING.has(status)) return true;
      if (status === 'STALE') return String(retrievalMode || '').toLowerCase() === 'mandatory';
      return false;
    }

    /** Classify a single dependency. `referenceTime` defaults to now (override for tests). */
    static classify(input: DependencyInput, referenceTime?: string): DependencyHealthResult {
      const now = parseDate(referenceTime) ?? Date.now();
      const rawStatus = String(input.status || '').toLowerCase().trim();

      let status: DependencyHealthStatus = 'HEALTHY';

      // 1) Resolution — an id that does not resolve, or an explicit not-found.
      if (input.exists === false || (input.id == null && input.type)) {
        status = 'MISSING';
      } else if (['deleted', 'hard_deleted', 'removed'].includes(rawStatus)) {
        status = 'DELETED';
      } else if (['revoked', 'access_revoked'].includes(rawStatus)) {
        status = 'REVOKED';
      } else if (rawStatus === 'expired') {
        status = 'EXPIRED';
      } else if (['archived'].includes(rawStatus)) {
        status = 'ARCHIVED';
      } else if (['paused', 'suspended', 'degraded'].includes(rawStatus)) {
        status = 'PAUSED';
      } else {
        // 2) Date-driven expiry.
        const effTo = parseDate(input.effective_to);
        const expiry = parseDate(input.expiry_date);
        const earliestEnd = [effTo, expiry].filter((d): d is number => d != null).sort((a, b) => a - b)[0] ?? null;

        if (earliestEnd != null && earliestEnd < now) {
          status = 'EXPIRED';
        } else {
          // 3) Staleness — review overdue or freshness window exceeded.
          const reviewDue = parseDate(input.review_date);
          const freshnessMs = parseFreshnessMs(input.freshness_rule);
          const lastUpdated = parseDate(input.last_updated_at);
          const freshnessExpiry = freshnessMs != null && lastUpdated != null ? lastUpdated + freshnessMs : null;

          if ((reviewDue != null && reviewDue < now) || (freshnessExpiry != null && freshnessExpiry < now)) {
            status = 'STALE';
          } else {
            // 4) Warning — approaching expiry/review window, or not-yet-effective.
            const effFrom = parseDate(input.effective_from);
            const approachingEnd = earliestEnd != null && earliestEnd - now <= WARNING_WINDOW_MS;
            const approachingReview = reviewDue != null && reviewDue - now <= WARNING_WINDOW_MS && reviewDue >= now;
            const notYetEffective = effFrom != null && effFrom > now;
            status = approachingEnd || approachingReview || notYetEffective ? 'WARNING' : 'HEALTHY';
          }
        }
      }

      const severity = this.getSeverity(status);
      const blocking = this.isBlocking(status, input.retrieval_mode);
      const reasonMap: Record<DependencyHealthStatus, string> = {
        HEALTHY: 'Dependency is active, in scope, and fresh.',
        WARNING: 'Dependency is healthy but approaching an expiry or review window.',
        STALE: blocking
          ? 'Mandatory dependency is stale (review overdue / freshness window exceeded) — blocks until refreshed.'
          : 'Dependency is stale (review overdue / freshness window exceeded).',
        EXPIRED: 'Dependency has passed its effective/expiry date.',
        REVOKED: 'Dependency access has been revoked.',
        MISSING: 'Dependency target could not be resolved.',
        PAUSED: 'Dependency target is paused/suspended.',
        ARCHIVED: 'Dependency target is archived.',
        DELETED: 'Dependency target has been deleted.',
      };

      return {
        type: input.type,
        id: input.id ?? null,
        status,
        severity,
        blocking,
        reason: reasonMap[status],
        recommendations: RECOMMENDATIONS[status],
      };
    }

    /** Classify many dependencies. */
    static classifyBatch(inputs: DependencyInput[], referenceTime?: string): DependencyHealthResult[] {
      return (inputs || []).map((i) => this.classify(i, referenceTime));
    }

    /** Roll up a set of classified results into counts, blocking state, and severity. */
    static summarize(results: DependencyHealthResult[]): DependencyHealthSummary {
      const by_status: Record<string, number> = {};
      const rollupMap = new Map<string, { dependency_type: string; status: DependencyHealthStatus; severity: DependencySeverity; blocking: boolean; count: number }>();
      let blocking_count = 0;
      let highestIdx = 0;

      for (const r of results || []) {
        by_status[r.status] = (by_status[r.status] || 0) + 1;
        if (r.blocking) blocking_count++;
        highestIdx = Math.max(highestIdx, SEVERITY_ORDER.indexOf(r.severity));

        const key = `${r.type}:${r.status}`;
        const existing = rollupMap.get(key);
        if (existing) existing.count++;
        else rollupMap.set(key, { dependency_type: r.type, status: r.status, severity: r.severity, blocking: r.blocking, count: 1 });
      }

      return {
        total: (results || []).length,
        by_status,
        blocking_count,
        blocked: blocking_count > 0,
        highest_severity: SEVERITY_ORDER[highestIdx],
        rollup: Array.from(rollupMap.values()),
      };
    }
  }
