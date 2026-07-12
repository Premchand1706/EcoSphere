import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import { ScopeCategory, CarbonLogStatus } from '../types/enums';
import { GamificationService } from './gamification.service';

export interface CreateCarbonLogDto {
  departmentId: string;
  activityType: string;
  category: ScopeCategory;
  quantity: number;
  unit: string;
  emissionFactorId: string;
  logDate: string;
  evidenceUrl?: string;
  notes?: string;
}

export class CarbonService {
  /**
   * Logs a new carbon emissions record.
   */
  static async createCarbonLog(userId: string, orgId: string, dto: CreateCarbonLogDto) {
    // 1. Fetch emission factor
    const ef = await prisma.emissionFactor.findUnique({
      where: { id: dto.emissionFactorId }
    });

    if (!ef) {
      throw new AppError(400, 'Invalid Emission Factor ID.', 'VALIDATION_FAILED');
    }

    // 2. Perform automated carbon calculation: quantity * factor
    const factorMultiplier = Number(ef.factor);
    const quantity = Number(dto.quantity);
    const calculatedCo2e = quantity * factorMultiplier;

    // 3. Create CarbonLog
    const log = await prisma.carbonLog.create({
      data: {
        organizationId: orgId,
        departmentId: dto.departmentId,
        loggedById: userId,
        activityType: dto.activityType,
        category: dto.category,
        quantity,
        unit: dto.unit,
        emissionFactorId: dto.emissionFactorId,
        calculatedCo2e,
        logDate: new Date(dto.logDate),
        evidenceUrl: dto.evidenceUrl,
        notes: dto.notes,
        status: CarbonLogStatus.PENDING_APPROVAL
      }
    });

    return log;
  }

  /**
   * Approves or Rejects a pending carbon log.
   */
  static async approveCarbonLog(logId: string, approverId: string, orgId: string, action: 'APPROVED' | 'REJECTED') {
    const log = await prisma.carbonLog.findFirst({
      where: { id: logId, organizationId: orgId }
    });

    if (!log) {
      throw new AppError(404, 'Carbon log not found.', 'NOT_FOUND');
    }

    if (log.status !== CarbonLogStatus.PENDING_APPROVAL) {
      throw new AppError(400, 'Carbon log is already processed.', 'VALIDATION_FAILED');
    }

    const updatedLog = await prisma.carbonLog.update({
      where: { id: logId },
      data: {
        status: action === 'APPROVED' ? CarbonLogStatus.APPROVED : CarbonLogStatus.REJECTED,
        approvedById: approverId
      }
    });

    // If approved, trigger gamification rules (XP and Badge unlocks)
    if (action === 'APPROVED') {
      await GamificationService.awardXp(log.loggedById, 50, `Approved Carbon Log - ${log.activityType}`);
      await GamificationService.checkAndAwardBadges(log.loggedById, orgId);
      await GamificationService.updateChallengesProgress(log.loggedById, 'CARBON_REDUCTION', 1);
    }

    return updatedLog;
  }

  /**
   * Fetches analytical summaries of scope logs.
   */
  static async getCarbonAnalytics(orgId: string, departmentId?: string) {
    const whereClause: any = {
      organizationId: orgId,
      status: CarbonLogStatus.APPROVED
    };

    if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    const logs = await prisma.carbonLog.groupBy({
      by: ['category'],
      where: whereClause,
      _sum: { calculatedCo2e: true }
    });

    const scopeMetrics = {
      SCOPE_1: 0,
      SCOPE_2: 0,
      SCOPE_3: 0,
      total: 0
    };

    for (const group of logs) {
      const category = group.category as ScopeCategory;
      const sum = Number(group._sum.calculatedCo2e || 0);
      scopeMetrics[category as 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3'] = sum;
      scopeMetrics.total += sum;
    }

    return scopeMetrics;
  }
}
