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
      // Check if user already has a Supabase Auth account
      let existingUserId: string | null = null;
      try {
        const { data: userRecord } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (userRecord?.id) {
          existingUserId = userRecord.id;
        }
      } catch {}

      if (existingUserId) {
        // Update existing user's password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUserId, {
          password: newPassword,
          email_confirm: true,
        });

        if (!updateError) {
          userId = existingUserId;
        }
      } else {
        // Create new auth user with the provided password
        const name = fullName || email.split('@')[0];
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: newPassword,
          email_confirm: true,
          user_metadata: { full_name: name },
        });

        if (createError) {
          logger.error(`[OTP] createUser error: ${createError.message}`);
        } else if (createData?.user) {
          userId = createData.user.id;
          // Create public.users record
          await supabaseAdmin.from('users').upsert({
            id: userId,
            email,
            full_name: name,
            is_superadmin: false,
          });
        }
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
