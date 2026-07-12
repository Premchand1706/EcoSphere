import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';
import { GamificationService } from '../services/gamification.service';
import { prisma } from '../config/database';
import { z } from 'zod';

const router = Router();

const redeemSchema = z.object({
  rewardId: z.string().uuid()
});

router.use(authenticate);

// GET /leaderboard
router.get('/leaderboard', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId;

    // Fetch individual ranking
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: { id: true, firstName: true, lastName: true, xp: true, level: true },
      orderBy: { xp: 'desc' },
      take: 50
    });

    const individualLeaderboard = users.map((u, index) => ({
      rank: index + 1,
      userId: u.id,
      name: `${u.firstName} ${u.lastName}`,
      level: u.level,
      xp: u.xp
    }));

    // Fetch department rankings
    const depts = await prisma.department.findMany({
      where: { organizationId: orgId },
      include: {
        users: { select: { xp: true } }
      }
    });

    const departmentRankings = depts
      .map((d) => {
        const totalXp = d.users.reduce((acc, curr) => acc + curr.xp, 0);
        const avgXp = d.users.length > 0 ? totalXp / d.users.length : 0;
        return {
          departmentId: d.id,
          name: d.name,
          averageXpPerMember: Math.round(avgXp * 100) / 100
        };
      })
      .sort((a, b) => b.averageXpPerMember - a.averageXpPerMember)
      .map((d, index) => ({
        rank: index + 1,
        ...d
      }));

    res.json({
      organizationLeaderboard: individualLeaderboard,
      departmentRankings
    });
  } catch (error) {
    next(error);
  }
});

// GET /badges
router.get('/badges', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const badges = await prisma.badge.findMany({
      where: {
        OR: [
          { organizationId: null },
          { organizationId: req.user!.orgId }
        ]
      }
    });
    res.json(badges);
  } catch (error) {
    next(error);
  }
});

// GET /badges/me
router.get('/badges/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const earned = await prisma.userBadge.findMany({
      where: { userId: req.user!.userId },
      include: { badge: true }
    });
    res.json(earned.map(e => e.badge));
  } catch (error) {
    next(error);
  }
});

// GET /rewards
router.get('/rewards', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rewards = await prisma.reward.findMany({
      where: { organizationId: req.user!.orgId, status: 'ACTIVE' }
    });
    res.json(rewards);
  } catch (error) {
    next(error);
  }
});

// POST /rewards/redeem
router.post('/rewards/redeem', authorize(['EMPLOYEE']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { rewardId } = redeemSchema.parse(req.body);
    const redemption = await GamificationService.redeemReward(req.user!.userId, rewardId, req.user!.orgId);
    res.json(redemption);
  } catch (error) {
    next(error);
  }
});

// GET /challenges
router.get('/challenges', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const challenges = await prisma.challenge.findMany({
      where: { organizationId: req.user!.orgId },
      include: {
        userChallenges: { where: { userId: req.user!.userId } },
        badge: true
      },
      orderBy: { startDate: 'desc' }
    });
    res.json(challenges);
  } catch (error) {
    next(error);
  }
});

export default router;
