import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createHash } from 'crypto';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { sendEmail } from '../../services/email.service';

/**
 * Website Lead Capture — public endpoints for the ZoikoVertex marketing site.
 *
 * Handles all landing-site form submissions that previously had no backend:
 *   • /request-demo        → POST /api/v1/website/leads/demo
 *   • /contact-sales       → POST /api/v1/website/leads/contact-sales
 *   • /about (48-hr audit) → POST /api/v1/website/leads/audit
 *   • /demo-library        → POST /api/v1/website/leads/demo-library
 *   • /resources-hub       → POST /api/v1/website/leads/resource
 *   • /privacy             → POST /api/v1/website/leads/privacy
 *
 * Every submission is validated (zod), persisted to public.website_leads via
 * the service-role client, and routed to the sales inbox by email. Email is
 * fire-and-forget: a Resend outage never fails the visitor's submission.
 */

// ─── Shared building blocks ─────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const trimTo = (max: number) =>
  z.string().transform(s => s.trim()).pipe(
    z.string().min(1).max(max, `Must be ${max} characters or fewer`)
  );

const optionalText = (max: number) =>
  z.string().max(max, `Must be ${max} characters or fewer`).optional().or(z.literal(''));

/** Free-text fields we store but never echo or email raw — basic HTML-tag strip. */
const sanitize = (s: string) => s.replace(/<[^>]*>/g, '').trim();

/** SHA-256 of client IP — abuse forensics only, never a raw IP at rest. */
function hashIp(req: Request): string | null {
  const raw = req.headers['x-forwarded-for']?.toString().split(',')[0].trim()
    || req.ip
    || req.socket.remoteAddress
    || '';
  return raw ? createHash('sha256').update(raw).digest('hex').slice(0, 32) : null;
}

/**
 * Best-effort dedupe: same source + email within 5 minutes is a double-click.
 * Email is the identity — ip_hash is forensics only, never a dedupe condition
 * (same person may legitimately re-submit from a different network).
 */
async function isDuplicate(source: string, email: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data } = await supabaseAdmin
      .from('website_leads')
      .select('id')
      .eq('source', source)
      .ilike('email', email)
      .gte('created_at', since)
      .limit(1);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false; // fail-open — a rare duplicate beats a lost lead
  }
}

/** Fire-and-forget internal routing email. Never throws, never blocks the response. */
function notifySales(subject: string, lines: string[], leadId: string, idemKey: string): void {
  const inbox = process.env.SALES_INBOX_EMAIL || 'sales@zoikovertex.com';
  const body = [
    `New website lead — ${subject}`,
    '',
    ...lines,
    '',
    `Lead ID: ${leadId}`,
    `Submitted: ${new Date().toISOString()}`,
  ].join('\n');
  sendEmail({
    to: inbox,
    subject,
    text: body,
    stream: 'marketing',
    idempotencyKey: idemKey,
    templateId: 'ZV-WEB-LEAD-001',
    templateVersion: '1.0',
    deliveryBasis: 'Internal sales routing — website form submission',
  }).catch(err => logger.error({ err, leadId }, '[website-leads] Sales notification failed'));
}

/** Shared persistence + response. Returns the inserted lead id, or null on failure. */
async function persistLead(
  source: string,
  data: { fullName: string; email: string; company?: string; phone?: string; country?: string },
  payload: Record<string, unknown>,
  req: Request,
  priority: 'low' | 'normal' | 'high' = 'normal',
): Promise<string | null> {
  const { data: row, error } = await supabaseAdmin
    .from('website_leads')
    .insert({
      source,
      priority,
      full_name: sanitize(data.fullName),
      email: data.email.toLowerCase().trim(),
      company: data.company ? sanitize(data.company) : null,
      phone: data.phone ? sanitize(data.phone) : null,
      country: data.country ? sanitize(data.country) : null,
      payload,
      consent: true,
      source_url: typeof req.headers.referer === 'string' ? req.headers.referer.slice(0, 500) : null,
      user_agent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 300) : null,
      ip_hash: hashIp(req),
    })
    .select('id')
    .single();
  if (error) throw error;
  return row?.id ?? null;
}

const GENERIC_OK = {
  success: true,
  message: 'Request received. Our team will reach out shortly.',
} as const;

// ─── 1. Request a Demo (/request-demo) ──────────────────────────────────────

const DemoSchema = z.object({
  fullName:        trimTo(120),
  workEmail:       z.string().trim().regex(EMAIL_RE, 'Invalid email address').max(200),
  company:         trimTo(160),
  role:            trimTo(80),
  companySize:     trimTo(40),
  primaryInterest: trimTo(120),
  phone:           optionalText(40),
  country:         optionalText(80),
  challenge:       optionalText(2000),
});

export const submitDemoRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = DemoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
    }
    const d = parsed.data;
    if (await isDuplicate('request_demo', d.workEmail)) {
      return res.status(200).json(GENERIC_OK); // idempotent success for double-clicks
    }
    const leadId = await persistLead('request_demo', { fullName: d.fullName, email: d.workEmail, company: d.company, phone: d.phone, country: d.country }, {
      role: d.role, company_size: d.companySize, primary_interest: d.primaryInterest,
      challenge: d.challenge ? sanitize(d.challenge) : null,
    }, req, 'high');
    if (!leadId) return res.status(500).json({ success: false, error: 'Could not record your request. Please try again.' });
    notifySales(
      'New demo request — ' + d.company,
      [
        'Name: ' + d.fullName,
        'Email: ' + d.workEmail,
        'Company: ' + d.company,
        'Role: ' + d.role,
        'Size: ' + d.companySize,
        'Interest: ' + d.primaryInterest,
        ...(d.phone ? ['Phone: ' + d.phone] : []),
        ...(d.country ? ['Country: ' + d.country] : []),
        ...(d.challenge ? ['Challenge: ' + sanitize(d.challenge)] : []),
      ],
      leadId,
      'website-lead:request_demo:' + leadId,
    );
    return res.status(201).json(GENERIC_OK);
  } catch (err) {
    next(err);
  }
};

// ─── 2. Contact Sales (/contact-sales) ──────────────────────────────────────

const ContactSalesSchema = z.object({
  firstName:       trimTo(80),
  lastName:        trimTo(80),
  workEmail:       z.string().trim().regex(EMAIL_RE, 'Invalid email address').max(200),
  company:         trimTo(160),
  companySize:     optionalText(40),
  timeline:        optionalText(80),
  primaryInterest: trimTo(120),
  consent:         z.boolean().refine(v => v === true, 'Consent is required to submit'),
});

export const submitContactSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ContactSalesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
    }
    const d = parsed.data;
    const email = d.workEmail.toLowerCase();
    if (await isDuplicate('contact_sales', email)) {
      return res.status(200).json(GENERIC_OK);
    }
    const fullName = (d.firstName + ' ' + d.lastName).trim();
    const leadId = await persistLead('contact_sales',
      { fullName, email, company: d.company },
      {
        first_name: d.firstName, last_name: d.lastName,
        company_size: d.companySize || null, timeline: d.timeline || null,
        primary_interest: d.primaryInterest,
      },
      req, 'high',
    );
    if (!leadId) return res.status(500).json({ success: false, error: 'Could not record your request. Please try again.' });
    notifySales(
      'Contact sales — ' + d.company,
      [
        'Name: ' + fullName,
        'Email: ' + d.workEmail,
        'Company: ' + d.company,
        'Size: ' + (d.companySize || 'n/a'),
        'Timeline: ' + (d.timeline || 'n/a'),
        'Interest: ' + d.primaryInterest,
      ],
      leadId,
      'website-lead:contact_sales:' + leadId,
    );
    return res.status(201).json(GENERIC_OK);
  } catch (err) {
    next(err);
  }
};

// ─── 3. 48-Hour Audit (/about — AboutAudit form) ────────────────────────────

const AuditSchema = z.object({
  fullName:  trimTo(120),
  workEmail: z.string().trim().regex(EMAIL_RE, 'Invalid email address').max(200),
  orgName:   trimTo(160),
  orgSize:   trimTo(40),
  challenge: optionalText(2000),
});

export const submitAuditRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = AuditSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
    }
    const d = parsed.data;
    if (await isDuplicate('audit_request', d.workEmail)) {
      return res.status(200).json({
        success: true,
        message: 'Audit request received. Response within 48 hours — deliverables are yours to keep.',
      });
    }
    const leadId = await persistLead('audit_request', { fullName: d.fullName, email: d.workEmail, company: d.orgName }, {
      org_size: d.orgSize, challenge: d.challenge ? sanitize(d.challenge) : null,
    }, req, 'high');
    if (!leadId) return res.status(500).json({ success: false, error: 'Could not record your request. Please try again.' });
    notifySales(
      '48-hour audit request — ' + d.orgName,
      [
        'Name: ' + d.fullName,
        'Email: ' + d.workEmail,
        'Organisation: ' + d.orgName,
        'Size: ' + d.orgSize,
        ...(d.challenge ? ['Challenge: ' + sanitize(d.challenge)] : []),
      ],
      leadId,
      'website-lead:audit_request:' + leadId,
    );
    return res.status(201).json({
      success: true,
      message: 'Audit request received. Response within 48 hours — deliverables are yours to keep.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── 4. Demo Library — Request Live Demo (/demo-library) ────────────────────

const DemoLibrarySchema = z.object({
  fullName:  trimTo(120),
  workEmail: z.string().trim().regex(EMAIL_RE, 'Invalid email address').max(200),
  company:   trimTo(160),
  teamSize:  trimTo(40),
  useCase:   trimTo(80),
  govReqs:   z.array(z.string().trim().min(1).max(80)).max(10).optional(),
  message:   optionalText(2000),
});

export const submitDemoLibraryRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = DemoLibrarySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
    }
    const d = parsed.data;
    if (await isDuplicate('demo_library', d.workEmail)) {
      return res.status(200).json(GENERIC_OK);
    }
    const leadId = await persistLead('demo_library', { fullName: d.fullName, email: d.workEmail, company: d.company }, {
      team_size: d.teamSize, use_case: d.useCase, gov_requirements: d.govReqs ?? [],
      message: d.message ? sanitize(d.message) : null,
    }, req, 'normal');
    if (!leadId) return res.status(500).json({ success: false, error: 'Could not record your request. Please try again.' });
    notifySales(
      'Live demo request (demo library) — ' + d.company,
      [
        'Name: ' + d.fullName,
        'Email: ' + d.workEmail,
        'Company: ' + d.company,
        'Team size: ' + d.teamSize,
        'Use case: ' + d.useCase,
        'Governance: ' + ((d.govReqs ?? []).join(', ') || 'none specified'),
        ...(d.message ? ['Message: ' + sanitize(d.message)] : []),
      ],
      leadId,
      'website-lead:demo_library:' + leadId,
    );
    return res.status(201).json(GENERIC_OK);
  } catch (err) {
    next(err);
  }
};

// ─── 5. Resources Hub — gated toolkit download (/resources-hub) ─────────────

const ResourceSchema = z.object({
  workEmail:  z.string().trim().regex(EMAIL_RE, 'Invalid email address').max(200),
  fullName:   trimTo(120),
  company:    optionalText(160),
  toolkit:    trimTo(160),
});

export const submitResourceRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ResourceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
    }
    const d = parsed.data;
    if (await isDuplicate('resource_download:' + d.toolkit, d.workEmail)) {
      return res.status(200).json({
        success: true,
        message: 'Check your inbox — the toolkit is on its way.',
      });
    }
    const leadId = await persistLead('resource_download',
      { fullName: d.fullName, email: d.workEmail, company: d.company },
      { toolkit: d.toolkit },
      req, 'low',
    );
    if (!leadId) return res.status(500).json({ success: false, error: 'Could not record your request. Please try again.' });
    notifySales(
      'Toolkit download — ' + d.toolkit,
      [
        'Toolkit: ' + d.toolkit,
        'Name: ' + d.fullName,
        'Email: ' + d.workEmail,
        ...(d.company ? ['Company: ' + d.company] : []),
      ],
      leadId,
      'website-lead:resource:' + leadId,
    );
    return res.status(201).json({
      success: true,
      message: 'Check your inbox — the toolkit is on its way.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── 6b. Cookie consent evidence (page item 13 — Cookie Preferences) ────────

const CONSENT_ACTIONS = ['accept_all', 'reject_non_essential', 'save_preference'] as const;

const ConsentSchema = z.object({
  consentId:     z.string().trim().min(8).max(128),
  action:        z.enum(CONSENT_ACTIONS),
  preferences:   z.record(z.string().max(40), z.boolean()).default({}),
  policyVersion: z.string().trim().max(20).default('1.0'),
});

export const submitCookieConsent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ConsentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
    }
    const { consentId, action, preferences, policyVersion } = parsed.data;
    const { error } = await supabaseAdmin
      .from('cookie_consents')
      .insert({
        consent_id: consentId,
        action,
        preferences,
        policy_version: policyVersion,
        source_url: typeof req.headers.referer === 'string' ? req.headers.referer.slice(0, 500) : null,
        user_agent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 300) : null,
        ip_hash: hashIp(req),
      });
    if (error) throw error;
    return res.status(201).json({ success: true, message: 'Preference saved.' });
  } catch (err) {
    next(err);
  }
};

// ─── 6. Privacy Request (/privacy — Submit a Privacy Request) ───────────────

const PRIVACY_TOPICS = [
  'access', 'correct', 'delete', 'restrict', 'portability',
  'opt_out_sale', 'do_not_sell', 'other',
] as const;

const PrivacySchema = z.object({
  fullName:  trimTo(120),
  workEmail: z.string().trim().regex(EMAIL_RE, 'Invalid email address').max(200),
  topic:     z.enum(PRIVACY_TOPICS, { message: 'Select a valid request type' }),
  details:   optionalText(2000),
});

export const submitPrivacyRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = PrivacySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
    }
    const d = parsed.data;
    if (await isDuplicate('privacy_request', d.workEmail)) {
      return res.status(200).json({
        success: true,
        message: 'Privacy request received. Our privacy team will respond within statutory timeframes.',
      });
    }
    const leadId = await persistLead('privacy_request', { fullName: d.fullName, email: d.workEmail }, {
      topic: d.topic, details: d.details ? sanitize(d.details) : null,
    }, req, 'high');
    if (!leadId) return res.status(500).json({ success: false, error: 'Could not record your request. Please try again.' });
    notifySales(
      'Privacy request (' + d.topic + ') — ' + d.workEmail,
      [
        'Name: ' + d.fullName,
        'Email: ' + d.workEmail,
        'Request type: ' + d.topic,
        ...(d.details ? ['Details: ' + sanitize(d.details)] : []),
      ],
      leadId,
      'website-lead:privacy:' + leadId,
    );
    return res.status(201).json({
      success: true,
      message: 'Privacy request received. Our privacy team will respond within statutory timeframes.',
    });
  } catch (err) {
    next(err);
  }
};
