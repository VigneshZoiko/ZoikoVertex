import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../shared/logger';
import { readFileSync } from 'fs';
import { join } from 'path';

let client: Resend | null = null;

const LOGO_CID = 'zoikovertex-logo';
let logoAttachment: { filename: string; content: string; cid: string } | null = null;
try {
  const logoPath = join(__dirname, '..', '..', '..', 'frontend', 'public', 'images', 'zoikovertexlogo.png');
  logoAttachment = {
    filename: 'zoikovertexlogo.png',
    content: readFileSync(logoPath, 'base64'),
    cid: LOGO_CID,
  };
} catch {
  try {
    const logoPath = join(__dirname, '..', '..', '..', '..', 'frontend', 'public', 'images', 'zoikovertexlogo.png');
    logoAttachment = {
      filename: 'zoikovertexlogo.png',
      content: readFileSync(logoPath, 'base64'),
      cid: LOGO_CID,
    };
  } catch {
    logger.warn('[email] Could not load zoikovertexlogo.png');
  }
}

function getClient(): Resend | null {
  if (client) return client;
  if (!env.RESEND_API_KEY) {
    logger.warn('[email] RESEND_API_KEY not configured — emails will not be sent');
    return null;
  }
  client = new Resend(env.RESEND_API_KEY);
  return client;
}

function buildHtml(body: string): string {
  const logoImg = logoAttachment
    ? `<img src="cid:${LOGO_CID}" alt="ZoikoVertex" style="height:32px;width:auto;opacity:0.9;" />`
    : `<span style="font-size:20px;font-weight:600;color:#18181b;">ZoikoVertex</span>`;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 32px 0 32px;text-align:center;">
              ${logoImg}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px 32px;font-size:15px;line-height:1.6;color:#27272a;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;text-align:center;">
              &copy; ${new Date().getFullYear()} ZoikoGroup. All rights reserved.
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

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const c = getClient();
  if (!c) {
    logger.info({ to: options.to, subject: options.subject }, '[email] Skipped (no Resend key)');
    return;
  }
  try {
    await c.emails.send({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || buildHtml(textToHtml(options.text)),
      attachments: logoAttachment ? [logoAttachment] : undefined,
    });
    logger.info({ to: options.to, subject: options.subject }, '[email] Sent via Resend');
  } catch (err) {
    logger.error({ err, to: options.to }, '[email] Failed to send via Resend');
  }
}

export async function sendOrgDeletionWarning(orgName: string, orgId: string, ownerEmail: string, deletionDate: string): Promise<void> {
  await sendEmail({
    to: ownerEmail,
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
