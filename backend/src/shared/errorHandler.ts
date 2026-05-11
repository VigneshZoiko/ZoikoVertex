import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { env } from '../config/env';

export const errorHandler = (err: Error & { statusCode?: number; code?: string }, req: Request, res: Response, _next: NextFunction) => {
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
