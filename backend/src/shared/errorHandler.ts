import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';
import { env } from '../config/env';

export const errorHandler = (err: Error & { statusCode?: number; code?: string }, req: Request, res: Response, _next: NextFunction) => {
  // Zod validation errors → 400 with readable messages
  if (err instanceof ZodError) {
    const zodErr = err as ZodError;
    const issues: { message: string }[] = (zodErr as unknown as { issues: { message: string }[] }).issues ?? [];
    const messages = issues.length ? issues.map((i) => i.message).join(', ') : err.message;
    logger.warn({ path: req.path, method: req.method }, `[Validation] ${messages}`);
    return res.status(400).json({
      success: false,
      error: { message: messages, code: 'VALIDATION_ERROR' },
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  const logData: Record<string, unknown> = {
    msg: message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  };

  if (env.NODE_ENV !== 'production') {
    logData.body = req.body;
  }

  logger.error(logData);

  res.status(statusCode).json({
    success: false,
    error: {
      message: env.NODE_ENV === 'production' ? 'Internal Server Error' : message,
      code: err.code || 'INTERNAL_ERROR',
    },
  });
};
