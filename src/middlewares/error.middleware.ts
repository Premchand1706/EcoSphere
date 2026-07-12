import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let status = 500;
  let title = 'Internal Server Error';
  let code = 'DATABASE_ERROR';
  let detail = 'An unexpected error occurred on the server.';
  let errors: any[] = [];

  if (err instanceof AppError) {
    status = err.status;
    code = err.code;
    detail = err.message;
    title = status >= 500 ? 'Internal Server Error' : 'Client Error';
    errors = err.details || [];
  } else if (err instanceof ZodError) {
    status = 400;
    title = 'Request Parameter Invalid';
    code = 'VALIDATION_FAILED';
    detail = 'Validation failed for one or more request inputs.';
    errors = err.errors.map((zErr) => ({
      field: zErr.path.join('.'),
      message: zErr.message,
    }));
  } else if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    // Prisma errors
    status = 400;
    title = 'Database Query Error';
    code = 'DATABASE_CONSTRAINT_VIOLATION';
    detail = `Database operation failed: constraint validation or database error occurred.`;
    logger.error('Prisma Error Details:', err);
  } else {
    logger.error('Unhandled Server Error Details:', err);
  }

  res.status(status).json({
    type: `https://ecosphere.com/errors/${code.toLowerCase().replace(/_/g, '-')}`,
    title,
    status,
    detail,
    instance: req.originalUrl,
    code,
    errors: errors.length > 0 ? errors : undefined,
  });
};
