import crypto from 'crypto';
import { withRedis } from '../shared/redis';
import { sendVerificationCode } from './email.service';

const OTP_TTL_SECONDS = 600; // 10 min — matches ZV-AUTH-OTP-001 template copy + mandatory control
const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 5;

const memoryStore = new Map<string, { hash: string; attempts: number; expiresAt: number }>();
const rateLimitMap = new Map<string, number>();
const verifiedEmails = new Map<string, number>();

function generateOtpCode(): string {
  return crypto.randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH).toString();
}

function otpKey(email: string): string {
  return `otp:signup:${email.toLowerCase()}`;
}

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function sendOtp(email: string): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  const lastSent = rateLimitMap.get(normalizedEmail);
  if (lastSent && Date.now() - lastSent < 60000) {
    const waitSeconds = Math.ceil((60000 - (Date.now() - lastSent)) / 1000);
    return { success: false, message: `Please wait ${waitSeconds}s before requesting a new code.` };
  }

  const code = generateOtpCode();
  const hash = hashOtp(code);

  const stored = await withRedis<boolean>(
    async (r) => {
      await r.set(otpKey(normalizedEmail), JSON.stringify({ hash, attempts: 0 }), 'EX', OTP_TTL_SECONDS);
      return true;
    },
    false
  );

  if (!stored) {
    memoryStore.set(normalizedEmail, {
      hash,
      attempts: 0,
      expiresAt: Date.now() + OTP_TTL_SECONDS * 1000,
    });
  }

  rateLimitMap.set(normalizedEmail, Date.now());

  if (rateLimitMap.size > 1000) {
    const cutoff = Date.now() - 120000;
    for (const [key, ts] of rateLimitMap) {
      if (ts < cutoff) rateLimitMap.delete(key);
    }
  }

  await sendVerificationCode({
    to: normalizedEmail,
    code,
    eventId: `auth.otp.signup:${normalizedEmail}`,
  });

  return { success: true, message: 'Verification code sent to your email.' };
}

function getStoredOtp(email: string): { hash: string; attempts: number } | null {
  const normalizedEmail = email.toLowerCase().trim();
  const memEntry = memoryStore.get(normalizedEmail);
  if (!memEntry) return null;
  if (memEntry.expiresAt < Date.now()) {
    memoryStore.delete(normalizedEmail);
    return null;
  }
  return { hash: memEntry.hash, attempts: memEntry.attempts };
}

export async function verifyOtp(email: string, code: string): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  if (!code || !/^\d{6}$/.test(code)) {
    return { success: false, message: 'Invalid code format.' };
  }

  let storedData: { hash: string; attempts: number } | null = null;

  const raw = await withRedis<string | null>(
    async (r) => await r.get(otpKey(normalizedEmail)),
    null
  );

  if (raw) {
    storedData = JSON.parse(raw);
  } else {
    storedData = getStoredOtp(normalizedEmail);
  }

  if (!storedData) {
    return { success: false, message: 'No verification code found. Please request a new one.' };
  }

  if (storedData.attempts >= MAX_ATTEMPTS) {
    await cleanupOtp(normalizedEmail);
    return { success: false, message: 'Too many incorrect attempts. Please request a new code.' };
  }

  if (storedData.hash !== hashOtp(code)) {
    storedData.attempts++;
    if (raw) {
      await withRedis(
        async (r) => await r.set(otpKey(normalizedEmail), JSON.stringify(storedData), 'EX', OTP_TTL_SECONDS),
        undefined
      );
    } else {
      const memEntry = memoryStore.get(normalizedEmail);
      if (memEntry) memEntry.attempts = storedData.attempts;
    }

    const remaining = MAX_ATTEMPTS - storedData.attempts;
    return { success: false, message: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
  }

  await cleanupOtp(normalizedEmail);
  return { success: true, message: 'Email verified successfully.' };
}

export function markOtpVerified(email: string): void {
  verifiedEmails.set(email.toLowerCase().trim(), Date.now());
}

export function isOtpVerified(email: string, withinMs = 30 * 60 * 1000): boolean {
  const ts = verifiedEmails.get(email.toLowerCase().trim());
  if (!ts) return false;
  if (Date.now() - ts > withinMs) {
    verifiedEmails.delete(email.toLowerCase().trim());
    return false;
  }
  return true;
}

async function cleanupOtp(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  await withRedis(async (r) => await r.del(otpKey(normalizedEmail)), undefined);
  memoryStore.delete(normalizedEmail);
}
