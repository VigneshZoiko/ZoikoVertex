/* eslint-disable @typescript-eslint/no-explicit-any */
// ─────────────────────────────────────────────────────────────────────────────
// In-memory Supabase mock for Prompt Governance tests.
//
// Chainable query builder backed by per-table fixtures. Supports the operations
// the prompt-governance services use:
//   select(cols, {count, head}) / eq / neq / in / is / not / or / order / limit /
//   range / maybeSingle / single / insert / update / await (thenable).
//
// Phase 4 additions (backward-compatible): insert(), update(), range(), not(),
// and count/head support on select(). Validation-only — no real DB, no network.
// Set fixtures per test via setFixtures().
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

let __idCounter = 0;
function genId(table: string): string {
  __idCounter += 1;
  return `${table}-mock-${__idCounter}`;
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

type Mode = 'select' | 'insert' | 'update';

class QueryBuilder {
  private preds: Pred[] = [];
  private _order?: { col: string; asc: boolean };
  private _limit?: number;
  private _from?: number;
  private _to?: number;
  private _count = false;
  private _head = false;
  private _mode: Mode = 'select';
  private _payload: any;

  constructor(private table: string) {}

  private get store(): any[] {
    if (!mockState.fixtures[this.table]) mockState.fixtures[this.table] = [];
    return mockState.fixtures[this.table];
  }

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.count) this._count = true;
    if (opts?.head) this._head = true;
    return this;
  }
  insert(payload: any) { this._mode = 'insert'; this._payload = payload; return this; }
  update(patch: any) { this._mode = 'update'; this._payload = patch; return this; }
  delete() { this._mode = 'delete'; return this; }

  eq(col: string, val: any) { this.preds.push((r) => r[col] === val); return this; }
  neq(col: string, val: any) { this.preds.push((r) => r[col] !== val); return this; }
  lt(col: string, val: any) { this.preds.push((r) => r[col] < val); return this; }
  lte(col: string, val: any) { this.preds.push((r) => r[col] <= val); return this; }
  gt(col: string, val: any) { this.preds.push((r) => r[col] > val); return this; }
  gte(col: string, val: any) { this.preds.push((r) => r[col] >= val); return this; }
  in(col: string, vals: any[]) { const set = new Set(vals); this.preds.push((r) => set.has(r[col])); return this; }
  is(col: string, val: any) { this.preds.push((r) => (val === null ? r[col] == null : r[col] === val)); return this; }
  not(col: string, op: string, val: any) {
    if (op === 'is' && val === null) this.preds.push((r) => r[col] != null);
    else if (op === 'eq') this.preds.push((r) => r[col] !== val);
    return this;
  }
  or(expr: string) { this.preds.push(parseOr(expr)); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this._order = { col, asc: opts?.ascending !== false }; return this; }
  limit(n: number) { this._limit = n; return this; }
  range(from: number, to: number) { this._from = from; this._to = to; return this; }

  /** Filtered + ordered, BEFORE range/limit slicing (count basis). */
  private filtered(): any[] {
    let rows = this.store.filter((r) => this.preds.every((p) => p(r)));
    if (this._order) {
      const { col, asc } = this._order;
      rows = [...rows].sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }
    return rows;
  }

  /** Apply range (preferred) or limit slicing. */
  private sliced(rows: any[]): any[] {
    if (this._from != null) return rows.slice(this._from, (this._to ?? rows.length - 1) + 1);
    if (this._limit != null) return rows.slice(0, this._limit);
    return rows;
  }

  private applyInsert(): any[] {
    const rowsIn = Array.isArray(this._payload) ? this._payload : [this._payload];
    const inserted = rowsIn.map((r) => ({ ...r, id: r.id ?? genId(this.table) }));
    this.store.push(...inserted);
    return inserted;
  }

  private applyUpdate(): any[] {
    const matches = this.store.filter((r) => this.preds.every((p) => p(r)));
    for (const row of matches) Object.assign(row, this._payload);
    return matches;
  }

  private applyDelete(): any[] {
    const store = this.store;
    const keep: any[] = [];
    const deleted: any[] = [];
    for (const r of store) {
      if (this.preds.every((p) => p(r))) {
        deleted.push(r);
      } else {
        keep.push(r);
      }
    }
    store.length = 0;
    for (const r of keep) store.push(r);
    return deleted;
  }

  async maybeSingle() {
    const rows = this.sliced(this.filtered());
    return { data: rows[0] ?? null, error: null };
  }

  async single() {
    if (this._mode === 'insert') {
      const inserted = this.applyInsert();
      return { data: inserted[0], error: null };
    }
    if (this._mode === 'update') {
      const updated = this.applyUpdate();
      return updated.length ? { data: updated[0], error: null } : { data: null, error: { message: 'no rows' } };
    }
    if (this._mode === 'delete') {
      const deleted = this.applyDelete();
      return { data: deleted[0] ?? null, error: null };
    }
    const rows = this.sliced(this.filtered());
    return rows.length ? { data: rows[0], error: null } : { data: null, error: { message: 'no rows' } };
  }

  // Thenable: `await builder` resolves with mode-appropriate result.
  then(onFulfilled?: any, onRejected?: any) {
    let result: any;
    if (this._mode === 'insert') {
      result = { data: this.applyInsert(), error: null };
    } else if (this._mode === 'update') {
      result = { data: this.applyUpdate(), error: null };
    } else if (this._mode === 'delete') {
      result = { data: this.applyDelete(), error: null };
    } else {
      const all = this.filtered();
      result = {
        data: this._head ? null : this.sliced(all),
        error: null,
        ...(this._count ? { count: all.length } : {}),
      };
    }
    return Promise.resolve(result).then(onFulfilled, onRejected);
  }
}

export const supabaseAdmin = {
  from(table: string) {
    return new QueryBuilder(table);
  },
  rpc: () => Promise.resolve({ data: null, error: null }),
};

// Mirror the real module's named exports so the mock is a drop-in.
export const supabase = supabaseAdmin;
