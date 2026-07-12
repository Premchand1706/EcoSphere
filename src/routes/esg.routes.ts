import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { EsgService } from '../services/esg.service';
import { prisma } from '../config/database';

const router = Router();

router.use(authenticate);

// GET /score
router.get('/score', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scoreDetails = await EsgService.calculateOrganizationEsg(req.user!.orgId);
    res.json(scoreDetails);
  } catch (error) {
    next(error);
  }
});

// GET /score/department/:id
router.get('/score/department/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scoreDetails = await EsgService.calculateDepartmentEsg(req.params.id);
    res.json(scoreDetails);
  } catch (error) {
    next(error);
  }
});

// GET /notifications
router.get('/notifications', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    next(error);
  }
});

// POST /notifications/:id/read
router.post('/notifications/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await prisma.notification.update({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { isRead: true }
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
