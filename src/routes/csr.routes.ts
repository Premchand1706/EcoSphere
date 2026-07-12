import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';
import { CsrService } from '../services/csr.service';
import { prisma } from '../config/database';
import { CsrActivityType } from '../types/enums';
import { z } from 'zod';

const router = Router();

const createActivitySchema = z.object({
  title: z.string(),
  description: z.string(),
  type: z.nativeEnum(CsrActivityType),
  startDate: z.string(),
  endDate: z.string(),
  requiredHours: z.number().nonnegative().optional(),
  targetFund: z.number().nonnegative().optional(),
  evidenceRequired: z.boolean().optional()
});

const logHoursSchema = z.object({
  loggedHours: z.number().positive(),
  evidenceUrl: z.string().url().optional()
});

const approvalSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED'])
});

router.use(authenticate);

// GET /activities
router.get('/activities', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const activities = await prisma.csrActivity.findMany({
      where: { organizationId: req.user!.orgId },
      orderBy: { startDate: 'desc' }
    });
    res.json(activities);
  } catch (error) {
    next(error);
  }
});

// POST /activities
router.post('/activities', authorize(['ORG_ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createActivitySchema.parse(req.body);
    const activity = await CsrService.createActivity(req.user!.orgId, validated as any);
    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
});

// POST /activities/:id/register
router.post('/activities/:id/register', authorize(['EMPLOYEE']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reg = await CsrService.registerUser(req.user!.userId, req.params.id);
    res.json(reg);
  } catch (error) {
    next(error);
  }
});

// GET /registrations
router.get('/registrations', authorize(['ORG_ADMIN', 'DEPT_MANAGER']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const regs = await prisma.csrRegistration.findMany({
      where: {
        csrActivity: { organizationId: req.user!.orgId }
      },
      include: {
        csrActivity: true,
        user: { select: { firstName: true, lastName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(regs);
  } catch (error) {
    next(error);
  }
});

// POST /registrations/:id/log-hours
router.post('/registrations/:id/log-hours', authorize(['EMPLOYEE']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { loggedHours, evidenceUrl } = logHoursSchema.parse(req.body);
    const reg = await CsrService.logVolunteeringHours(req.user!.userId, req.params.id, loggedHours, evidenceUrl);
    res.json(reg);
  } catch (error) {
    next(error);
  }
});

// POST /registrations/:id/approve
router.post('/registrations/:id/approve', authorize(['ORG_ADMIN', 'DEPT_MANAGER']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { action } = approvalSchema.parse(req.body);
    const reg = await CsrService.approveRegistration(req.params.id, req.user!.userId, action);
    res.json(reg);
  } catch (error) {
    next(error);
  }
});

export default router;
