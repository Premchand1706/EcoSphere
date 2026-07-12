import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    orgId: string;
    role: string;
    email: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'Access token is missing or invalid.', 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key-ecosphere-2026-hackathon-odoo') as any;
    req.user = {
      userId: decoded.userId,
      orgId: decoded.orgId,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (error) {
    next(new AppError(401, 'Token verification failed or token has expired.', 'UNAUTHORIZED'));
  }
};
