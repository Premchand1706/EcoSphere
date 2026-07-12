import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

// POST /login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { email },
      include: { role: true, organization: true }
    });

    if (!user) {
      return next(new AppError(401, 'Invalid email or password.', 'UNAUTHORIZED'));
    }

    if (user.status !== 'ACTIVE') {
      return next(new AppError(403, 'Account is suspended or deactivated.', 'FORBIDDEN'));
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return next(new AppError(401, 'Invalid email or password.', 'UNAUTHORIZED'));
    }

    // Sign JWT
    const token = jwt.sign(
      {
        userId: user.id,
        orgId: user.organizationId,
        role: user.role.name,
        email: user.email
      },
      process.env.JWT_SECRET || 'super-secret-key-ecosphere-2026-hackathon-odoo',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role.name,
        organizationId: user.organizationId,
        organizationName: user.organization.name
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /me
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, organization: true, department: true }
    });

    if (!user) {
      return next(new AppError(404, 'User not found.', 'NOT_FOUND'));
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name,
      xp: user.xp,
      level: user.level,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
      departmentId: user.departmentId,
      departmentName: user.department?.name || null
    });
  } catch (error) {
    next(error);
  }
});

export default router;
