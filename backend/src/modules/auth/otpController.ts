import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { supabaseAdmin } from '../../shared/supabase';
import { sendOtp, verifyOtp, markOtpVerified } from '../../services/otp.service';

const EmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const VerifySchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().min(6).max(6),
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

    // Check if the user already has a Supabase Auth account
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = listData?.users?.find((u) => u.email === email);

    if (existingUser) {
      // User exists — generate temp password so they can sign in immediately
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: tempPassword,
        email_confirm: true,
      });

      if (!updateError) {
        return res.json({
          success: true,
          message: 'Email verified.',
          data: { email, existing_user: true, temp_password: tempPassword },
        });
      }
    }

    res.json({
      success: true,
      message: 'Email verified.',
      data: { email },
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
