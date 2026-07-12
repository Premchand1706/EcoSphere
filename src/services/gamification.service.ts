import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import { ChallengeType, ChallengeStatus, UserChallengeStatus, BadgeRuleType, RedemptionStatus, RewardStatus } from '../types/enums';

export class GamificationService {
  /**
   * Awards XP to a user and handles automated leveling progression.
   */
  static async awardXp(userId: string, amount: number, reason: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return;

    const newXp = user.xp + amount;
    // Level formula: L = floor(1 + sqrt(xp / 100))
    const newLevel = Math.floor(1 + Math.sqrt(newXp / 100));

    await prisma.user.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel }
    });

    // Send level up notifications
    if (newLevel > user.level) {
      await prisma.notification.create({
        data: {
          organizationId: user.organizationId,
          userId,
          title: 'Level Up!',
          message: `Congratulations! You leveled up to Level ${newLevel}! Keep saving the planet.`,
          type: 'SYSTEM'
        }
      });
    }
  }

  /**
   * Evaluates active challenges and updates user progress parameters.
   */
  static async updateChallengesProgress(userId: string, type: ChallengeType | string, increment: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return;

    // Fetch active challenges matching type
    const activeChallenges = await prisma.challenge.findMany({
      where: {
        organizationId: user.organizationId,
        type,
        status: ChallengeStatus.ACTIVE
      }
    });

    for (const challenge of activeChallenges) {
      // Find or create user challenge progress
      const userChallenge = await prisma.userChallenge.upsert({
        where: { challengeId_userId: { challengeId: challenge.id, userId } },
        update: {
          currentValue: { increment }
        },
        create: {
          challengeId: challenge.id,
          userId,
          currentValue: increment,
          status: UserChallengeStatus.JOINED
        }
      });

      // Check if target reached
      if (userChallenge.status === UserChallengeStatus.JOINED && Number(userChallenge.currentValue) >= Number(challenge.targetValue)) {
        await prisma.userChallenge.update({
          where: { id: userChallenge.id },
          data: {
            status: UserChallengeStatus.COMPLETED,
            completedAt: new Date()
          }
        });

        // Award rewards
        await this.awardXp(userId, challenge.xpReward, `Completed Challenge - ${challenge.title}`);

        if (challenge.badgeId) {
          await prisma.userBadge.upsert({
            where: { userId_badgeId: { userId, badgeId: challenge.badgeId } },
            update: {},
            create: { userId, badgeId: challenge.badgeId }
          });

          const badge = await prisma.badge.findUnique({ where: { id: challenge.badgeId } });
          await prisma.notification.create({
            data: {
              organizationId: user.organizationId,
              userId,
              title: 'Challenge Badge Unlocked!',
              message: `You earned the "${badge?.name}" badge for completing the challenge "${challenge.title}".`,
              type: 'BADGE'
            }
          });
        }
      }
    }
  }

  /**
   * Evaluates and awards badge items if thresholds are met.
   */
  static async checkAndAwardBadges(userId: string, orgId: string) {
    const lockedBadges = await prisma.badge.findMany({
      where: {
        OR: [
          { organizationId: orgId },
          { organizationId: null }
        ],
        userBadges: { none: { userId } }
      }
    });

    for (const badge of lockedBadges) {
      let unlocked = false;

      switch (badge.unlockRuleType) {
        case BadgeRuleType.CARBON_REDUCTION_COUNT: {
          const count = await prisma.carbonLog.count({
            where: { loggedById: userId, status: 'APPROVED' }
          });
          unlocked = count >= badge.unlockRuleValue;
          break;
        }
        case BadgeRuleType.CSR_HOURS_THRESHOLD: {
          const sumAggregate = await prisma.csrRegistration.aggregate({
            where: { userId, approvalStatus: 'APPROVED' },
            _sum: { loggedHours: true }
          });
          unlocked = Number(sumAggregate._sum.loggedHours || 0) >= badge.unlockRuleValue;
          break;
        }
        case BadgeRuleType.POLICY_READ_ALL: {
          const activeCount = await prisma.policy.count({
            where: { organizationId: orgId, status: 'ACTIVE' }
          });
          const acknowledgedCount = await prisma.policyAcknowledgement.count({
            where: { userId, policy: { status: 'ACTIVE' } }
          });
          unlocked = activeCount > 0 && acknowledgedCount === activeCount;
          break;
        }
        case BadgeRuleType.PERFECT_COMPLIANCE: {
          const openIssues = await prisma.complianceIssue.count({
            where: { ownerId: userId, status: 'OVERDUE' }
          });
          unlocked = openIssues === 0;
          break;
        }
      }

      if (unlocked) {
        await prisma.userBadge.create({
          data: { userId, badgeId: badge.id }
        });

        await prisma.notification.create({
          data: {
            organizationId: orgId,
            userId,
            title: 'Badge Unlocked!',
            message: `Congratulations! You unlocked the "${badge.name}" badge.`,
            type: 'BADGE'
          }
        });
      }
    }
  }

  /**
   * Process transactional catalog redemptions inside database transactions.
   */
  static async redeemReward(userId: string, rewardId: string, orgId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch user & reward with lock checks
      const user = await tx.user.findUnique({ where: { id: userId } });
      const reward = await tx.reward.findUnique({ where: { id: rewardId } });

      if (!user || !reward) {
        throw new AppError(404, 'User or Reward not found.', 'NOT_FOUND');
      }

      if (reward.status !== RewardStatus.ACTIVE) {
        throw new AppError(400, 'This reward is currently inactive.', 'VALIDATION_FAILED');
      }

      if (reward.stock <= 0) {
        throw new AppError(400, 'This item is out of stock.', 'OUT_OF_STOCK');
      }

      if (user.xp < reward.xpCost) {
        throw new AppError(400, 'Insufficient XP balance.', 'INSUFFICIENT_XP');
      }

      // 2. Perform transaction adjustments
      await tx.user.update({
        where: { id: userId },
        data: { xp: { decrement: reward.xpCost } }
      });

      await tx.reward.update({
        where: { id: rewardId },
        data: { stock: { decrement: 1 } }
      });

      const redemption = await tx.redeemedReward.create({
        data: {
          rewardId,
          userId,
          status: RedemptionStatus.PENDING
        }
      });

      await tx.notification.create({
        data: {
          organizationId: orgId,
          userId,
          title: 'Reward Redeemed!',
          message: `Redemption for "${reward.title}" submitted. ${reward.xpCost} XP deducted.`,
          type: 'APPROVAL'
        }
      });

      return redemption;
    });
  }
}
