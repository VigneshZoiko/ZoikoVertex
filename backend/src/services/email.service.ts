import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../shared/logger';

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
      html: options.html || options.text.replace(/\n/g, '<br>'),
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
