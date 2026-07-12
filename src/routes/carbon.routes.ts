import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';
import { CarbonService } from '../services/carbon.service';
import { prisma } from '../config/database';
import { ScopeCategory } from '../types/enums';
import { z } from 'zod';

const router = Router();

const createLogSchema = z.object({
  departmentId: z.string().uuid(),
  activityType: z.string(),
  category: z.nativeEnum(ScopeCategory),
  quantity: z.number().positive(),
  unit: z.string(),
  emissionFactorId: z.string().uuid(),
  logDate: z.string(),
  evidenceUrl: z.string().url().optional(),
  notes: z.string().optional()
});

const approvalSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED'])
});

// Apply authentication to all carbon routes
router.use(authenticate);

// POST /logs
router.post('/logs', authorize(['ORG_ADMIN', 'DEPT_MANAGER']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createLogSchema.parse(req.body);
    const log = await CarbonService.createCarbonLog(req.user!.userId, req.user!.orgId, validated as any);
    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
});

// GET /logs
router.get('/logs', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.carbonLog.findMany({
      where: { organizationId: req.user!.orgId },
      include: { department: true, loggedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { logDate: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// POST /logs/:id/approve
router.post('/logs/:id/approve', authorize(['ORG_ADMIN', 'DEPT_MANAGER']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { action } = approvalSchema.parse(req.body);
    const log = await CarbonService.approveCarbonLog(req.params.id, req.user!.userId, req.user!.orgId, action);
    res.json(log);
  } catch (error) {
    next(error);
  }
});

// GET /factors
router.get('/factors', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const factors = await prisma.emissionFactor.findMany({
      where: {
        OR: [
          { organizationId: null },
          { organizationId: req.user!.orgId }
        ]
      }
    });
    res.json(factors);
  } catch (error) {
    next(error);
  }
});

// GET /analytics
router.get('/analytics', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const departmentId = req.query.departmentId as string | undefined;
    const scopeMetrics = await CarbonService.getCarbonAnalytics(req.user!.orgId, departmentId);
    res.json(scopeMetrics);
  } catch (error) {
    next(error);
  }
});

export default router;
