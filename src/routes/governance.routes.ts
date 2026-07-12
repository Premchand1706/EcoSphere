import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';
import { GovernanceService } from '../services/governance.service';
import { prisma } from '../config/database';
import { PolicyCategory, SeverityLevel } from '../types/enums';
import { z } from 'zod';

const router = Router();

const createPolicySchema = z.object({
  title: z.string(),
  content: z.string(),
  category: z.nativeEnum(PolicyCategory),
  version: z.string()
});

const createIssueSchema = z.object({
  auditId: z.string().uuid().optional(),
  title: z.string(),
  description: z.string(),
  severity: z.nativeEnum(SeverityLevel),
  ownerId: z.string().uuid(),
  dueDate: z.string()
});

const resolveIssueSchema = z.object({
  resolutionDetails: z.string()
});

router.use(authenticate);

// GET /policies
router.get('/policies', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const policies = await prisma.policy.findMany({
      where: { organizationId: req.user!.orgId },
      include: { signatures: { where: { userId: req.user!.userId } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(policies);
  } catch (error) {
    next(error);
  }
});

// POST /policies
router.post('/policies', authorize(['ORG_ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createPolicySchema.parse(req.body);
    const policy = await GovernanceService.createPolicy(req.user!.orgId, validated as any);
    res.status(201).json(policy);
  } catch (error) {
    next(error);
  }
});

// POST /policies/:id/acknowledge
router.post('/policies/:id/acknowledge', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ack = await GovernanceService.acknowledgePolicy(req.user!.userId, req.params.id, req.user!.orgId);
    res.json(ack);
  } catch (error) {
    next(error);
  }
});

// GET /compliance-issues
router.get('/compliance-issues', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const issues = await prisma.complianceIssue.findMany({
      where: { organizationId: req.user!.orgId },
      include: { owner: { select: { firstName: true, lastName: true } } },
      orderBy: { dueDate: 'asc' }
    });
    res.json(issues);
  } catch (error) {
    next(error);
  }
});

// POST /compliance-issues
router.post('/compliance-issues', authorize(['ORG_ADMIN', 'AUDITOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validated = createIssueSchema.parse(req.body);
    const issue = await GovernanceService.createComplianceIssue(req.user!.orgId, validated as any);
    res.status(201).json(issue);
  } catch (error) {
    next(error);
  }
});

// POST /compliance-issues/:id/resolve
router.post('/compliance-issues/:id/resolve', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { resolutionDetails } = resolveIssueSchema.parse(req.body);
    const issue = await GovernanceService.resolveComplianceIssue(req.params.id, req.user!.userId, req.user!.orgId, resolutionDetails);
    res.json(issue);
  } catch (error) {
    next(error);
  }
});

// GET /audit-logs
router.get('/audit-logs', authorize(['ORG_ADMIN', 'AUDITOR']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { organizationId: req.user!.orgId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

export default router;
