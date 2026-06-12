import crypto from 'crypto';
import { withRedis } from '../shared/redis';
import { supabaseAdmin } from '../shared/supabase';
import { sendEmail } from './email.service';
import { logger } from '../shared/logger';

const MFA_TTL_SECONDS = 300;

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function mfaKey(userId: string): string {
  return `mfa:challenge:${userId}`;
}

export async function sendMfaChallenge(userId: string): Promise<{ success: boolean; message: string }> {
  const code = generateCode();
  const stored = await withRedis<boolean>(
    async (r) => {
      await r.set(mfaKey(userId), code, 'EX', MFA_TTL_SECONDS);
      return true;
    },
    false
  );

  if (!stored) {
    return { success: false, message: 'MFA service unavailable (Redis required). Please try again.' };
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (user?.email) {
    await sendEmail({
      to: user.email,
      subject: 'Your MFA Verification Code',
      text: [
        `Hi ${user.full_name || 'there'},`,
        '',
        `Your MFA verification code is: ${code}`,
        '',
        'This code expires in 5 minutes.',
        'If you did not request this code, please ignore this email.',
        '',
        '— ZoikoVertex Security Team',
      ].join('\n'),
    });
  } else {
    logger.warn({ userId }, '[mfa] No email found for user, MFA code not sent');
  }

  return { success: true, message: 'MFA code sent to your email.' };
}

export async function verifyMfaCode(userId: string, code: string): Promise<boolean> {
  if (!code || !/^\d{6}$/.test(code)) return false;

  const stored = await withRedis<string | null>(
    async (r) => {
      const val = await r.get(mfaKey(userId));
      return val;
    },
    null
  );

  if (!stored) return false;

  if (stored !== code) return false;

  await withRedis(
    async (r) => { await r.del(mfaKey(userId)); },
    undefined
  );

  return true;
}
