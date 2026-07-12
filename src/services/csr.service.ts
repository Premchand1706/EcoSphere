import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import { CsrActivityStatus, CsrRegistrationStatus, ApprovalStatus, CsrActivityType } from '../types/enums';
import { GamificationService } from './gamification.service';

export interface CreateCsrActivityDto {
  title: string;
  description: string;
  type: CsrActivityType;
  startDate: string;
  endDate: string;
  requiredHours?: number;
  targetFund?: number;
  evidenceRequired?: boolean;
}

export class CsrService {
  static async createActivity(orgId: string, dto: CreateCsrActivityDto) {
    const activity = await prisma.csrActivity.create({
      data: {
        organizationId: orgId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        requiredHours: dto.requiredHours || 0,
        targetFund: dto.targetFund || 0,
        evidenceRequired: dto.evidenceRequired !== undefined ? dto.evidenceRequired : true,
        status: CsrActivityStatus.DRAFT
      }
    });

    return activity;
  }

  static async registerUser(userId: string, activityId: string) {
    const activity = await prisma.csrActivity.findUnique({ where: { id: activityId } });
    if (!activity) {
      throw new AppError(404, 'CSR activity not found.', 'NOT_FOUND');
    }

    if (activity.status !== CsrActivityStatus.ACTIVE) {
      throw new AppError(400, 'CSR activity is not active.', 'VALIDATION_FAILED');
    }

    const registration = await prisma.csrRegistration.create({
      data: {
        csrActivityId: activityId,
        userId,
        status: CsrRegistrationStatus.REGISTERED,
        approvalStatus: ApprovalStatus.PENDING
      }
    });

    return registration;
  }

  static async logVolunteeringHours(userId: string, registrationId: string, hours: number, evidenceUrl?: string) {
    const registration = await prisma.csrRegistration.findUnique({
      where: { id: registrationId },
      include: { csrActivity: true }
    });

    if (!registration || registration.userId !== userId) {
      throw new AppError(404, 'Registration record not found.', 'NOT_FOUND');
    }

    if (registration.csrActivity.evidenceRequired && !evidenceUrl) {
      throw new AppError(400, 'Evidence URL is required for this activity.', 'VALIDATION_FAILED');
    }

    const updatedReg = await prisma.csrRegistration.update({
      where: { id: registrationId },
      data: {
        loggedHours: hours,
        evidenceUrl,
        status: CsrRegistrationStatus.PARTICIPATED,
        approvalStatus: ApprovalStatus.PENDING
      }
    });

    return updatedReg;
  }

  static async approveRegistration(registrationId: string, approverId: string, action: 'APPROVED' | 'REJECTED') {
    const registration = await prisma.csrRegistration.findUnique({
      where: { id: registrationId },
      include: { csrActivity: true, user: true }
    });

    if (!registration) {
      throw new AppError(404, 'Registration not found.', 'NOT_FOUND');
    }

    const status = action === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;

    const updatedReg = await prisma.csrRegistration.update({
      where: { id: registrationId },
      data: {
        approvalStatus: status,
        approvedById: approverId
      }
    });

    if (action === 'APPROVED') {
      // Volunteering grants 100 XP per hour logged
      const hours = Number(registration.loggedHours);
      const xpToAward = Math.round(hours * 100);

      await GamificationService.awardXp(registration.userId, xpToAward, `CSR Volunteering Hour Approval - ${registration.csrActivity.title}`);
      await GamificationService.checkAndAwardBadges(registration.userId, registration.csrActivity.organizationId);
      await GamificationService.updateChallengesProgress(registration.userId, 'CSR_PARTICIPATION', hours);
    }

    return updatedReg;
  }
}
