import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../shared/logger';
import { supabaseAdmin } from '../shared/supabase';

let client: Resend | null = null;

function getClient(): Resend | null {
  if (client) return client;
  if (!env.RESEND_API_KEY) {
    logger.warn('[email] RESEND_API_KEY not configured — emails will not be sent');
    return null;
  }
  client = new Resend(env.RESEND_API_KEY);
  return client;
}

// ─── Sending streams (doc §1: separate transactional/security/billing/legal/marketing) ──
export type EmailStream = 'transactional' | 'security' | 'billing' | 'legal' | 'marketing';

function resolveFrom(stream: EmailStream): string {
  switch (stream) {
    case 'security':  return env.EMAIL_FROM_SECURITY  || env.EMAIL_FROM;
    case 'billing':   return env.EMAIL_FROM_BILLING   || env.EMAIL_FROM;
    case 'legal':     return env.EMAIL_FROM_LEGAL     || env.EMAIL_FROM;
    case 'marketing': return env.EMAIL_FROM_MARKETING || env.EMAIL_FROM;
    default:          return env.EMAIL_FROM;
  }
}

// ─── Footer contract (doc §2) — values from config, with sensible URL fallbacks ──────────
function siteBase(): string {
  // Public marketing site (privacy/terms live here).
  return env.FRONTEND_URL.replace(/\/+$/, '');
}
function appBase(): string {
  // Authenticated app (dashboard pages: /support AI bot, /profile). Falls back to the site.
  return (env.CLIENT_URL || env.FRONTEND_URL).replace(/\/+$/, '');
}
function footerLinks(stream: EmailStream) {
  const privacy = env.PRIVACY_URL || `${siteBase()}/privacy`;
  const security = env.SECURITY_URL || `${siteBase()}/security`;
  // /support is the existing in-app AI support bot (authenticated dashboard route).
  const support = env.SUPPORT_URL || `${appBase()}/support`;
  // Marketing mail must expose a preference center; transactional/security/etc. are mandatory.
  const preference = env.PREFERENCE_CENTER_URL || `${appBase()}/profile`;
  return { privacy, security, support, preference, showPreference: stream === 'marketing' };
}

function footerHtml(stream: EmailStream): string {
  const { privacy, security, support, preference, showPreference } = footerLinks(stream);
  const brand = env.EMAIL_BRAND_NAME;
  const entity = env.LEGAL_ENTITY_NAME;
  // Per template spec: brand line, "A product operated by <entity>", then link row + copyright.
  const operatedBy = entity && entity !== brand
    ? `<div style="margin-top:2px;">A product operated by ${escapeHtml(entity)}.</div>`
    : '';
  const address = env.LEGAL_REGISTERED_ADDRESS
    ? `<div style="margin-top:4px;">${escapeHtml(env.LEGAL_REGISTERED_ADDRESS)}</div>`
    : '';
  const prefLink = showPreference
    ? ` &nbsp;·&nbsp; <a href="${preference}" style="color:#a1a1aa;">Email preferences</a>`
    : '';
  return `
    <div style="margin-bottom:2px;color:#71717a;font-weight:600;">${escapeHtml(brand)}</div>
    ${operatedBy}
    ${address}
    <div style="margin-top:8px;">
      <a href="${privacy}" style="color:#a1a1aa;">Privacy</a> &nbsp;·&nbsp;
      <a href="${security}" style="color:#a1a1aa;">Security</a> &nbsp;·&nbsp;
      <a href="${support}" style="color:#a1a1aa;">Support</a>${prefLink}
    </div>
    <div style="margin-top:8px;">&copy; ${new Date().getFullYear()} ${escapeHtml(entity || brand)}. All rights reserved.</div>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHtml(body: string, preheader: string | undefined, stream: EmailStream): string {
  // Hidden preheader: shown in the inbox preview line, invisible in the body.
  const pre = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>`
    : '';
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  ${pre}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 32px 0 32px;text-align:center;">
              <img src="${env.EMAIL_LOGO_URL}" alt="ZoikoVertex" style="height:32px;width:auto;opacity:0.9;" />
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px 32px;font-size:15px;line-height:1.6;color:#27272a;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;text-align:center;">
              ${footerHtml(stream)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function textToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/  • /g, '&nbsp;&nbsp;&bull; ');
}

// ─── Audit + idempotency (doc §1) ────────────────────────────────────────────────────────
interface EmailAuditRow {
  idempotency_key?: string | null;
  template_id?: string | null;
  template_version?: string | null;
  event_id?: string | null;
  stream: EmailStream;
  recipient_email: string;
  recipient_role?: string | null;
  delivery_basis?: string | null;
  subject: string;
  status: string;
  provider_message_id?: string | null;
  error?: string | null;
}

async function writeAudit(row: EmailAuditRow): Promise<void> {
  try {
    await supabaseAdmin.from('email_log').insert({ provider: 'resend', ...row });
  } catch (err) {
    // Audit failure must never block or crash a send.
    logger.error({ err }, '[email] Failed to write email_log audit row');
  }
}

async function isDuplicate(idempotencyKey: string): Promise<boolean> {
  try {
    const windowSecs = parseInt(env.EMAIL_CONSOLIDATION_WINDOW_SECONDS, 10) || 300;
    const since = new Date(Date.now() - windowSecs * 1000).toISOString();
    const { data } = await supabaseAdmin
      .from('email_log')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .eq('status', 'sent')
      .gte('created_at', since)
      .limit(1);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false; // fail-open on the dedup check; a rare duplicate beats a dropped email
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────────────────
export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Rich HTML body — wrapped in the branded shell (logo + footer). Preferred over raw `html`. */
  bodyHtml?: string;
  /** Sending stream — routes the `from` address and footer. Default 'transactional'. */
  stream?: EmailStream;
  /** Inbox preview line shown before the body is opened. */
  preheader?: string;
  /** Dedup key — a second send with the same key inside the consolidation window is skipped. */
  idempotencyKey?: string;
  /** Governed template identity for the audit record. */
  templateId?: string;
  templateVersion?: string;
  /** Authoritative backend event that triggered this send. */
  eventId?: string;
  recipientRole?: string;
  /** Why this recipient is authorized to receive it (audited). */
  deliveryBasis?: string;
  /** Optional pre-send authorization recheck (doc §1). Return false to suppress the send. */
  authorize?: () => Promise<boolean>;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const stream: EmailStream = options.stream || 'transactional';
  const auditBase = {
    idempotency_key: options.idempotencyKey ?? null,
    template_id: options.templateId ?? null,
    template_version: options.templateVersion ?? null,
    event_id: options.eventId ?? null,
    stream,
    recipient_email: options.to,
    recipient_role: options.recipientRole ?? null,
    delivery_basis: options.deliveryBasis ?? null,
    subject: options.subject,
  };

  const c = getClient();
  if (!c) {
    logger.info({ to: options.to, subject: options.subject }, '[email] Skipped (no Resend key)');
    await writeAudit({ ...auditBase, status: 'skipped_no_client' });
    return;
  }

  // Recipient authorization recheck immediately before delivery (doc §1).
  if (options.authorize) {
    let ok = false;
    try { ok = await options.authorize(); } catch { ok = false; }
    if (!ok) {
      logger.warn({ to: options.to, subject: options.subject }, '[email] Suppressed — recipient not authorized');
      await writeAudit({ ...auditBase, status: 'skipped_unauthorized' });
      return;
    }
  }

  // Idempotency / consolidation (doc §1).
  if (options.idempotencyKey && (await isDuplicate(options.idempotencyKey))) {
    logger.info({ to: options.to, key: options.idempotencyKey }, '[email] Skipped duplicate (idempotency)');
    await writeAudit({ ...auditBase, status: 'skipped_duplicate' });
    return;
  }

  try {
    const result = await c.emails.send({
      from: resolveFrom(stream),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || buildHtml(options.bodyHtml ?? textToHtml(options.text), options.preheader, stream),
    });
    logger.info({ to: options.to, subject: options.subject, stream }, '[email] Sent via Resend');
    await writeAudit({ ...auditBase, status: 'sent', provider_message_id: (result as any)?.data?.id ?? null });
  } catch (err) {
    logger.error({ err, to: options.to }, '[email] Failed to send via Resend');
    await writeAudit({ ...auditBase, status: 'failed', error: err instanceof Error ? err.message : String(err) });
  }
}

// ─── ZV-AUTH-OTP-001 — Verification code email (production template) ──────────────────────
export interface VerificationCodeContext {
  to: string;
  code: string;                 // 6 digits — never placed in subject/preheader (doc rule)
  requestTimestamp?: string;    // localized date/time of the sign-in request
  timeZone?: string;
  deviceAndBrowser?: string;    // shown "when reliable"
  city?: string;
  country?: string;
  eventId?: string;
  recipientRole?: string;
}

export async function sendVerificationCode(ctx: VerificationCodeContext): Promise<void> {
  const ts = ctx.requestTimestamp || new Date().toISOString().replace('T', ' ').slice(0, 16);
  const tz = ctx.timeZone || 'UTC';
  const locationKnown = ctx.city || ctx.country;
  const rows: string[] = [
    `<tr><td style="padding:4px 0;color:#71717a;">Requested</td><td style="padding:4px 0;text-align:right;">${escapeHtml(ts)} ${escapeHtml(tz)}</td></tr>`,
  ];
  if (ctx.deviceAndBrowser) rows.push(`<tr><td style="padding:4px 0;color:#71717a;">Device</td><td style="padding:4px 0;text-align:right;">${escapeHtml(ctx.deviceAndBrowser)}</td></tr>`);
  if (locationKnown) rows.push(`<tr><td style="padding:4px 0;color:#71717a;">Approximate location</td><td style="padding:4px 0;text-align:right;">${escapeHtml([ctx.city, ctx.country].filter(Boolean).join(', '))}</td></tr>`);

  const bodyHtml = `
    <h1 style="margin:0 0 16px 0;font-size:20px;color:#18181b;">Your verification code</h1>
    <p style="margin:0 0 16px 0;">Use the code below to complete your sign-in to ZoikoVertex.</p>
    <div style="text-align:center;margin:20px 0;">
      <span style="display:inline-block;font-size:32px;letter-spacing:8px;font-weight:700;color:#18181b;background:#f4f4f5;border-radius:10px;padding:16px 28px;">${escapeHtml(ctx.code)}</span>
    </div>
    <p style="margin:0 0 12px 0;">This code expires in 10 minutes and can be used only once.</p>
    <p style="margin:0 0 20px 0;color:#3f3f46;">Never share this code with anyone, including anyone claiming to work for ZoikoVertex. ZoikoVertex will never ask you to provide a verification code by phone, email, chat, or text message.</p>
    <div style="border:1px solid #e4e4e7;border-radius:10px;padding:14px 16px;margin:0 0 20px 0;">
      <div style="font-weight:600;color:#18181b;margin-bottom:6px;">Sign-in request</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#3f3f46;">${rows.join('')}</table>
    </div>
    <p style="margin:0;color:#71717a;font-size:13px;">If you did not request this code, do not share it. You can safely ignore this email. If you receive repeated verification codes, contact ZoikoVertex Support and review your account security.</p>`;

  const text = [
    `Your ZoikoVertex verification code: ${ctx.code}`,
    ``,
    `This code expires in 10 minutes and can be used only once.`,
    `Never share this code with anyone, including anyone claiming to work for ZoikoVertex. ZoikoVertex will never ask you to provide a verification code by phone, email, chat, or text message.`,
    ``,
    `Sign-in request`,
    `Requested: ${ts} ${tz}`,
    ...(ctx.deviceAndBrowser ? [`Device: ${ctx.deviceAndBrowser}`] : []),
    ...(locationKnown ? [`Approximate location: ${[ctx.city, ctx.country].filter(Boolean).join(', ')}`] : []),
    ``,
    `If you did not request this code, you can safely ignore this email.`,
  ].join('\n');

  await sendEmail({
    to: ctx.to,
    stream: 'security',
    subject: 'Your ZoikoVertex verification code',
    preheader: 'Complete your sign-in within 10 minutes.',
    bodyHtml,
    text,
    templateId: 'ZV-AUTH-OTP-001',
    templateVersion: '1.0',
    eventId: ctx.eventId,
    recipientRole: ctx.recipientRole,
    deliveryBasis: 'Account holder — sign-in verification challenge',
  });
}

// ─── Lifecycle wrappers (unchanged behavior; now inherit footer/preheader/audit) ─────────
export async function sendOrgDeletionWarning(orgName: string, orgId: string, ownerEmail: string, deletionDate: string): Promise<void> {
  await sendEmail({
    to: ownerEmail,
    stream: 'transactional',
    idempotencyKey: `org-deletion-warning:${orgId}:${deletionDate}`,
    eventId: `org.inactivity.warning:${orgId}`,
    deliveryBasis: 'Organization owner — mandatory account-lifecycle notice',
    preheader: `Action required to keep ${orgName} active.`,
    subject: `${orgName} will be deleted in 15 days due to inactivity`,
    text: [
      `Hi,`,
      ``,
      `Your organization "${orgName}" on ZoikoVertex has been inactive for over 12 months.`,
      `To keep your account active, please log in and perform any action within the platform.`,
      ``,
      `If no action is taken, your organization and all associated data will be permanently deleted on ${deletionDate}.`,
      ``,
      `This includes all workspaces, campaigns, media assets, and settings under this organization.`,
      ``,
      `If you have any questions, please contact our support team.`,
      ``,
      `— The ZoikoVertex Team`,
    ].join('\n'),
  });
}

export async function sendOrgWelcomeEmail(orgName: string, ownerEmail: string, ownerName: string): Promise<void> {
  await sendEmail({
    to: ownerEmail,
    stream: 'transactional',
    eventId: `org.created:${ownerEmail}`,
    deliveryBasis: 'Organization owner — account creation confirmation',
    preheader: `Your organization ${orgName} is ready.`,
    subject: `Welcome to ZoikoVertex — ${orgName} is ready!`,
    text: [
      `Hi ${ownerName},`,
      ``,
      `Welcome to ZoikoVertex! Your organization "${orgName}" has been created successfully.`,
      ``,
      `You can now log in and start managing your campaigns, media assets, and team members.`,
      ``,
      `Get started:`,
      `  • Set up your team and roles`,
      `  • Create your first campaign`,
      `  • Configure integrations with your ad platforms`,
      ``,
      `If you have any questions, check our documentation or contact our support team.`,
      ``,
      `— The ZoikoVertex Team`,
    ].join('\n'),
  });
}

export async function sendOrgDeletedNotification(orgName: string, ownerEmail: string): Promise<void> {
  await sendEmail({
    to: ownerEmail,
    stream: 'transactional',
    eventId: `org.deleted:${ownerEmail}`,
    deliveryBasis: 'Organization owner — mandatory data-deletion notice',
    preheader: `${orgName} has been removed from ZoikoVertex.`,
    subject: `${orgName} has been deleted due to inactivity`,
    text: [
      `Hi,`,
      ``,
      `Your organization "${orgName}" has been permanently deleted from ZoikoVertex due to 12 months of inactivity.`,
      ``,
      `All data associated with this organization has been purged from our systems.`,
      ``,
      `If you believe this was a mistake, please contact our support team.`,
      ``,
      `— The ZoikoVertex Team`,
    ].join('\n'),
  });
}
