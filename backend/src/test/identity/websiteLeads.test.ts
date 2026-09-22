import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SERVER_SRC = resolve(__dirname, '../../server.ts');

// ─── Mocks (hoisted) ─────────────────────────────────────────────────────────
vi.mock('../../shared/supabase', () => {
  const fixtures: Record<string, any[]> = {};
  const inserts: { table: string; row: any }[] = [];

  function makeFrom(table: string) {
    const state: any = { table, filters: [] as ((r: any) => boolean)[], selected: false, inserted: null as any };
    const builder: any = {
      select() { state.selected = true; return builder; },
      eq(col: string, val: any) { state.filters.push((r: any) => r[col] === val); return builder; },
      ilike(col: string, val: string) {
        const needle = String(val).replace(/%/g, '').toLowerCase();
        state.filters.push((r: any) => String(r[col] ?? '').toLowerCase() === needle);
        return builder;
      },
      gte(col: string, val: string) {
        state.filters.push((r: any) => new Date(r[col]).getTime() >= new Date(val).getTime());
        return builder;
      },
      limit() { return builder; },
      insert(row: any) { state.inserted = row; inserts.push({ table, row }); return builder; },
      single() { return builder; },
      // Supabase query builders are thenable — resolve on await.
      then(onFulfilled: any, onRejected: any) {
        let result: any;
        if (state.inserted !== null && state.selected) {
          result = { data: { id: `${table}-inserted-1` }, error: null };
        } else {
          const rows = (fixtures[state.table] ?? []).filter((r: any) => state.filters.every((p: any) => p(r)));
          result = { data: rows, error: null };
        }
        return Promise.resolve(result).then(onFulfilled, onRejected);
      },
    };
    return builder;
  }

  return {
    supabaseAdmin: {
      from: (t: string) => makeFrom(t),
      __setFixtures: (f: Record<string, any[]>) => {
        for (const k of Object.keys(fixtures)) delete fixtures[k];
        Object.assign(fixtures, f);
      },
      __inserts: inserts,
    },
  };
});

vi.mock('../../services/email.service', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import {
  submitDemoRequest, submitContactSales, submitAuditRequest,
  submitDemoLibraryRequest, submitResourceRequest, submitPrivacyRequest,
  submitCookieConsent,
} from '../../domains/identity/websiteLeadController';
import { sendEmail } from '../../services/email.service';
import { supabaseAdmin } from '../../shared/supabase';

const mock = supabaseAdmin as unknown as {
  __setFixtures: (f: Record<string, any[]>) => void;
  __inserts: { table: string; row: any }[];
};
const sendEmailMock = vi.mocked(sendEmail);

// ─── Express req/res harness ─────────────────────────────────────────────────
const makeReq = (body: any, headers: Record<string, string> = {}) =>
  ({ body, headers, ip: '203.0.113.9', socket: { remoteAddress: '203.0.113.9' } } as any);

const makeRes = () => {
  const res: any = { statusCode: 0, body: undefined as any };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
};
const makeNext = () => {
  const next: any = (err: any) => { next.err = err; };
  next.err = undefined;
  return next;
};

const VALID_DEMO = {
  fullName: 'Ada Lovelace', workEmail: 'ada@bigco.com', company: 'BigCo',
  role: 'CMO / Marketing Leader', companySize: '201–1000',
  primaryInterest: 'Governed AI Execution', phone: '', country: 'US',
  challenge: 'Need audit trails for AI content',
};

beforeEach(() => {
  mock.__setFixtures({});   // no pre-existing leads → not duplicates
  mock.__inserts.length = 0; // clear accumulated inserts from prior tests
  sendEmailMock.mockClear();
});

// ─── Item 2 — Request Demo ───────────────────────────────────────────────────
describe('Item 2 — POST /website/leads/demo (request demo)', () => {
  it('stores the lead (high priority) and routes a sales email', async () => {
    const res = makeRes(); const next = makeNext();
    await submitDemoRequest(makeReq(VALID_DEMO), res, next);

    expect(next.err).toBeUndefined();
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);

    const row = mock.__inserts.at(-1)!;
    expect(row.table).toBe('website_leads');
    expect(row.row.source).toBe('request_demo');
    expect(row.row.priority).toBe('high');
    expect(row.row.email).toBe('ada@bigco.com');
    expect(row.row.payload.primary_interest).toBe('Governed AI Execution');
    expect(row.row.ip_hash).toBeTruthy();           // hashed, never raw IP
    expect(row.row.ip_hash).not.toContain('203.0.113.9');
    expect(row.row.consent).toBe(true);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][0].subject).toContain('BigCo');
    expect(sendEmailMock.mock.calls[0][0].text).toContain('ada@bigco.com');
  });

  it('rejects invalid payloads with 400 (no insert, no email)', async () => {
    const res = makeRes(); const next = makeNext();
    await submitDemoRequest(makeReq({ ...VALID_DEMO, company: ' ' }), res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mock.__inserts).toHaveLength(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('is idempotent for duplicate submissions (200, no second row)', async () => {
    const existing = [{
      id: 'lead-1', source: 'request_demo', email: 'ada@bigco.com',
      created_at: new Date().toISOString(),
    }];
    mock.__setFixtures({ website_leads: existing });

    const res = makeRes(); const next = makeNext();
    await submitDemoRequest(makeReq(VALID_DEMO), res, next);

    expect(res.statusCode).toBe(200);   // dedupe path returns success
    expect(res.body.success).toBe(true);
    expect(mock.__inserts).toHaveLength(0);
  });
});

// ─── Item 1 — Resources Hub toolkit request ──────────────────────────────────
describe('Item 1 — POST /website/leads/resource (resources hub)', () => {
  it('stores the gated toolkit request and routes it', async () => {
    const res = makeRes(); const next = makeNext();
    await submitResourceRequest(makeReq({
      workEmail: 'buyer@retail.com', fullName: 'Grace Hopper',
      company: 'Retail Inc', toolkit: 'AI Governance Compliance Toolkit',
    }), res, next);

    expect(next.err).toBeUndefined();
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/toolkit/i);

    const row = mock.__inserts.at(-1)!;
    expect(row.row.source).toBe('resource_download');
    expect(row.row.payload.toolkit).toBe('AI Governance Compliance Toolkit');
    expect(sendEmailMock.mock.calls[0][0].text).toContain('AI Governance Compliance Toolkit');
  });

  it('rejects a malformed email with 400', async () => {
    const res = makeRes(); const next = makeNext();
    await submitResourceRequest(makeReq({ workEmail: 'not-an-email', fullName: 'X', toolkit: 'T' }), res, next);
    expect(res.statusCode).toBe(400);
    expect(mock.__inserts).toHaveLength(0);
  });
});

// ─── Item 4 — 48-hour Audit (About page) ─────────────────────────────────────
describe('Item 4 — POST /website/leads/audit (48-hour audit CTA)', () => {
  it('stores the audit request with the 48h SLA response', async () => {
    const res = makeRes(); const next = makeNext();
    await submitAuditRequest(makeReq({
      fullName: 'Alan T.', workEmail: 'alan@bank.co', orgName: 'Bank Co',
      orgSize: '1000+', challenge: 'Revenue leakage',
    }), res, next);

    expect(next.err).toBeUndefined();
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/48 hours/);

    const row = mock.__inserts.at(-1)!;
    expect(row.row.source).toBe('audit_request');
    expect(row.row.company).toBe('Bank Co');          // orgName mapped to company
    expect(row.row.payload.org_size).toBe('1000+');
    expect(sendEmailMock.mock.calls[0][0].subject).toContain('48-hour audit');
  });
});

// ─── Item 8 — Demo Library live demo request ─────────────────────────────────
describe('Item 8 — POST /website/leads/demo-library', () => {
  it('stores use case + governance requirements', async () => {
    const res = makeRes(); const next = makeNext();
    await submitDemoLibraryRequest(makeReq({
      fullName: 'J doe', workEmail: 'j@agency.io', company: 'Agency',
      teamSize: '51–200', useCase: 'Approvals',
      govReqs: ['Audit trail', 'SOC 2 readiness'], message: '',
    }), res, next);

    expect(next.err).toBeUndefined();
    expect(res.statusCode).toBe(201);

    const row = mock.__inserts.at(-1)!;
    expect(row.row.source).toBe('demo_library');
    expect(row.row.payload.use_case).toBe('Approvals');
    expect(row.row.payload.gov_requirements).toEqual(['Audit trail', 'SOC 2 readiness']);
  });
});

// ─── Item 10 — Contact Sales ─────────────────────────────────────────────────
describe('Item 10 — POST /website/leads/contact-sales', () => {
  it('requires consent — rejects without it', async () => {
    const res = makeRes(); const next = makeNext();
    await submitContactSales(makeReq({
      firstName: 'A', lastName: 'Reyes', workEmail: 'a@co.com', company: 'Co',
      primaryInterest: 'Agentic architecture', consent: false,
    }), res, next);

    expect(res.statusCode).toBe(400);
    expect(mock.__inserts).toHaveLength(0);
  });

  it('stores the request with consent captured', async () => {
    const res = makeRes(); const next = makeNext();
    await submitContactSales(makeReq({
      firstName: 'Alexandra', lastName: 'Reyes', workEmail: 'a@co.com', company: 'Co',
      companySize: '1000+', timeline: 'Q1', primaryInterest: 'Agentic architecture',
      consent: true,
    }), res, next);

    expect(res.statusCode).toBe(201);
    const row = mock.__inserts.at(-1)!;
    expect(row.row.full_name).toBe('Alexandra Reyes');
    expect(row.row.source).toBe('contact_sales');
    expect(row.row.payload.primary_interest).toBe('Agentic architecture');
  });
});

// ─── Item 11 — Privacy request (DSAR) ────────────────────────────────────────
describe('Item 11 — POST /website/leads/privacy (privacy request)', () => {
  it('accepts a valid DSAR topic', async () => {
    const res = makeRes(); const next = makeNext();
    await submitPrivacyRequest(makeReq({
      fullName: 'Data Subject', workEmail: 'me@example.com',
      topic: 'delete', details: 'Remove my data',
    }), res, next);

    expect(next.err).toBeUndefined();
    expect(res.statusCode).toBe(201);
    const row = mock.__inserts.at(-1)!;
    expect(row.row.source).toBe('privacy_request');
    expect(row.row.payload.topic).toBe('delete');
  });

  it('rejects unknown topics with 400', async () => {
    const res = makeRes(); const next = makeNext();
    await submitPrivacyRequest(makeReq({
      fullName: 'X', workEmail: 'x@x.com', topic: 'spam_me',
    }), res, next);
    expect(res.statusCode).toBe(400);
  });
});

// ─── Item 13 — Cookie consent evidence ───────────────────────────────────────
describe('Item 13 — POST /website/cookie-consent', () => {
  it.each([
    ['accept_all', { essential: true, analytics: true, marketing: true }],
    ['reject_non_essential', { essential: true, analytics: false, marketing: false }],
    ['save_preference', { essential: true, analytics: true, marketing: false }],
  ])('records %s as append-only evidence', async (action, preferences) => {
    const res = makeRes(); const next = makeNext();
    await submitCookieConsent(makeReq({
      consentId: 'consent-abc-123', action, preferences, policyVersion: '1.0',
    }), res, next);

    expect(next.err).toBeUndefined();
    expect(res.statusCode).toBe(201);
    const row = mock.__inserts.at(-1)!;
    expect(row.table).toBe('cookie_consents');
    expect(row.row.action).toBe(action);
    expect(row.row.preferences).toEqual(preferences);
    expect(row.row.ip_hash).toBeTruthy();
  });

  it('rejects invalid actions with 400', async () => {
    const res = makeRes(); const next = makeNext();
    await submitCookieConsent(makeReq({ consentId: 'consent-abc-123', action: 'maybe' }), res, next);
    expect(res.statusCode).toBe(400);
    expect(mock.__inserts).toHaveLength(0);
  });
});

// ─── Item 3 — Sign-up: route wiring (controller pre-existing, verified) ──────
describe('Item 3 — Sign-up backend already integrated', () => {
  it('signup-enterprise route is registered on a public, rate-limited path', () => {
    const src = readFileSync(SERVER_SRC, 'utf8');
    expect(src).toContain("app.post('/api/v1/auth/signup-enterprise', authRateLimit, enterpriseSignup)");
  });
});

// ─── Route registration for all new endpoints ────────────────────────────────
describe('All website form endpoints are registered', () => {
  it('exposes every lead + consent route (items 1, 2, 4, 8, 10, 11, 13)', () => {
    const src = readFileSync(SERVER_SRC, 'utf8');
    for (const route of [
      '/api/v1/website/leads/demo',
      '/api/v1/website/leads/contact-sales',
      '/api/v1/website/leads/audit',
      '/api/v1/website/leads/demo-library',
      '/api/v1/website/leads/resource',
      '/api/v1/website/leads/privacy',
      '/api/v1/website/cookie-consent',
    ]) {
      expect(src).toContain(`'${route}'`);
    }
  });

  it('marketing-site origins are CORS-allowed', () => {
    const src = readFileSync(SERVER_SRC, 'utf8');
    expect(src).toContain("'https://zoikovertex.com'");
    expect(src).toContain("'https://www.zoikovertex.com'");
  });
});
