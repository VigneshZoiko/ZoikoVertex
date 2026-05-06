import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({
    msg: message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : message,
      code: err.code || 'INTERNAL_ERROR',
    },
  });
};
