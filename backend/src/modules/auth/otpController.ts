import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { sendOtp, verifyOtp, markOtpVerified } from '../../services/otp.service';
import { logger } from '../../shared/logger';

const EmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const VerifySchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().min(6).max(6),
  newPassword: z.string().optional(),
  fullName: z.string().optional(),
});

/**
 * Locate an existing Supabase Auth user id by email — covers the case where an
 * auth user exists but has no public.users row (which made createUser fail with
 * "already registered" and left signup stuck in a verify loop).
 */
async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const target = email.toLowerCase().trim();
  try {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !data?.users?.length) break;
      const match = data.users.find((u) => (u.email || '').toLowerCase() === target);
      if (match) return match.id;
      if (data.users.length < 200) break; // last page
    }
  } catch (e) {
    logger.warn(`[OTP] findAuthUserIdByEmail failed: ${(e as Error).message}`);
  }
  return null;
}

export const sendOtpCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = EmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const result = await sendOtp(parsed.data.email);
    if (!result.success) {
      return res.status(429).json({ error: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};

export const verifyOtpCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = VerifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { email: rawEmail, code } = parsed.data;
    const email = rawEmail.toLowerCase().trim();

    const result = await verifyOtp(email, code);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    markOtpVerified(email);

    // Create or update the Supabase Auth user if a password was provided (email/password signup)
    let userId: string | null = null;
    const { newPassword, fullName } = parsed.data;

    if (newPassword) {
      const name = fullName || email.split('@')[0];

      // Resolve an existing user id — prefer public.users, then fall back to the
      // auth directory (an auth user can exist without a public.users row).
      let existingUserId: string | null = null;
      try {
        const { data: userRecord } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        existingUserId = userRecord?.id ?? null;
      } catch {}
      if (!existingUserId) {
        existingUserId = await findAuthUserIdByEmail(email);
      }

      if (existingUserId) {
        // OTP is verified — safe to (re)set the password so the user can sign in.
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUserId, {
          password: newPassword,
          email_confirm: true,
        });
        if (updateError) logger.error(`[OTP] updateUserById error: ${updateError.message}`);
        else userId = existingUserId;
      } else {
        // Create new auth user with the provided password.
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: newPassword,
          email_confirm: true,
          user_metadata: { full_name: name },
        });
        if (createData?.user) {
          userId = createData.user.id;
        } else if (createError) {
          // Race, or an auth user that wasn't found above — locate and update it.
          logger.error(`[OTP] createUser error: ${createError.message}`);
          const foundId = await findAuthUserIdByEmail(email);
          if (foundId) {
            const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(foundId, {
              password: newPassword,
              email_confirm: true,
            });
            if (!updErr) userId = foundId;
          }
        }
      }

      if (userId) {
        // Keep the public.users row in sync with the resolved auth id.
        await supabaseAdmin.from('users').upsert({
          id: userId,
          email,
          full_name: name,
          is_superadmin: false,
        });
      } else {
        // Never report success when the account isn't actually usable — otherwise
        // the client attempts a sign-in that can never work (the OTP verify loop).
        return res.status(500).json({
          error: 'We verified your email but could not finish creating your account. Please try signing in, or contact support.',
        });
      }
    }

    res.json({
      success: true,
      message: 'Email verified.',
      data: {
        email,
        ...(userId ? { user_id: userId, account_created: true } : {}),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const resendOtpCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = EmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const result = await sendOtp(parsed.data.email);
    if (!result.success) {
      return res.status(429).json({ error: result.message });
    }

    res.json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};
