/* eslint-disable @typescript-eslint/no-explicit-any */
// ─────────────────────────────────────────────────────────────────────────────
// In-memory Supabase mock for Prompt Governance dependency tests (Phase 3B.C).
//
// Provides a chainable query builder backed by per-table fixtures, supporting the
// exact operations the dependency services use: select / eq / in / is / or /
// order / limit / maybeSingle / single / await (thenable). Validation-only — no
// real DB, no network. Set fixtures per test via setFixtures().
// ─────────────────────────────────────────────────────────────────────────────

export interface Fixtures {
  [table: string]: any[];
}

export const mockState: { fixtures: Fixtures } = { fixtures: {} };

export function setFixtures(fixtures: Fixtures): void {
  mockState.fixtures = fixtures;
}

export function resetFixtures(): void {
  mockState.fixtures = {};
}

type Pred = (row: any) => boolean;

// Split a PostgREST or()/and() expression at top-level commas, respecting parens.
function splitTop(expr: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of expr) {
    if (ch === '(') { depth++; cur += ch; }
    else if (ch === ')') { depth--; cur += ch; }
    else if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur) parts.push(cur);
  return parts;
}

// Parse "col.op.val" → predicate. Supports eq and is.null.
function condToPred(cond: string): Pred {
  const idx1 = cond.indexOf('.');
  const idx2 = cond.indexOf('.', idx1 + 1);
  const col = cond.slice(0, idx1);
  const op = cond.slice(idx1 + 1, idx2);
  const val = cond.slice(idx2 + 1);
  if (op === 'eq') return (r) => String(r[col]) === val;
  if (op === 'is') return (r) => (val === 'null' ? r[col] == null : r[col] === val);
  return () => false;
}

function parseOr(expr: string): Pred {
  const groups = splitTop(expr).map((g) => {
    const t = g.trim();
    if (t.startsWith('and(')) {
      const inner = t.slice(4, t.lastIndexOf(')'));
      const conds = splitTop(inner).map(condToPred);
      return (r: any) => conds.every((p) => p(r));
    }
    return condToPred(t);
  });
  return (r: any) => groups.some((p) => p(r));
}

class QueryBuilder {
  private preds: Pred[] = [];
  private _order?: { col: string; asc: boolean };
  private _limit?: number;

  constructor(private getRows: () => any[]) {}

  select(_cols?: string) { return this; }
  eq(col: string, val: any) { this.preds.push((r) => r[col] === val); return this; }
  neq(col: string, val: any) { this.preds.push((r) => r[col] !== val); return this; }
  in(col: string, vals: any[]) { const set = new Set(vals); this.preds.push((r) => set.has(r[col])); return this; }
  is(col: string, val: any) { this.preds.push((r) => (val === null ? r[col] == null : r[col] === val)); return this; }
  or(expr: string) { this.preds.push(parseOr(expr)); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this._order = { col, asc: opts?.ascending !== false }; return this; }
  limit(n: number) { this._limit = n; return this; }

  private rows(): any[] {
    let rows = (this.getRows() || []).filter((r) => this.preds.every((p) => p(r)));
    if (this._order) {
      const { col, asc } = this._order;
      rows = [...rows].sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }
    if (this._limit != null) rows = rows.slice(0, this._limit);
    return rows;
  }

  async maybeSingle() { const r = this.rows(); return { data: r[0] ?? null, error: null }; }
  async single() {
    const r = this.rows();
    return r.length ? { data: r[0], error: null } : { data: null, error: { message: 'no rows' } };
  }
  // Thenable: `await builder` resolves to { data: rows, error }.
  then(onFulfilled?: any, onRejected?: any) {
    return Promise.resolve({ data: this.rows(), error: null }).then(onFulfilled, onRejected);
  }
}

export const supabaseAdmin = {
  from(table: string) {
    return new QueryBuilder(() => mockState.fixtures[table] || []);
  },
};

// Mirror the real module's named exports so the mock is a drop-in.
export const supabase = supabaseAdmin;
