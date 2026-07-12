import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import { PolicyCategory, PolicyStatus, SeverityLevel, IssueStatus } from '../types/enums';
import { GamificationService } from './gamification.service';

export interface CreatePolicyDto {
  title: string;
  content: string;
  category: PolicyCategory;
  version: string;
}

export interface CreateIssueDto {
  auditId?: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  ownerId: string;
  dueDate: string;
}

export class GovernanceService {
  static async createPolicy(orgId: string, dto: CreatePolicyDto) {
    const policy = await prisma.policy.create({
      data: {
        organizationId: orgId,
        title: dto.title,
        content: dto.content,
        category: dto.category,
        version: dto.version,
        status: PolicyStatus.DRAFT
      }
    });

    return policy;
  }

  static async acknowledgePolicy(userId: string, policyId: string, orgId: string) {
    const policy = await prisma.policy.findFirst({
      where: { id: policyId, organizationId: orgId, status: PolicyStatus.ACTIVE }
    });

    if (!policy) {
      throw new AppError(404, 'Active Policy not found.', 'NOT_FOUND');
    }

    const ack = await prisma.policyAcknowledgement.create({
      data: {
        policyId,
        userId
      }
    });

    // Acknowledging policy grants 150 XP
    await GamificationService.awardXp(userId, 150, `Policy Acknowledgment - ${policy.title}`);
    await GamificationService.checkAndAwardBadges(userId, orgId);
    await GamificationService.updateChallengesProgress(userId, 'POLICY_READING', 1);

    return ack;
  }

  static async createComplianceIssue(orgId: string, dto: CreateIssueDto) {
    // Verify owner exists and belongs to the organization
    const owner = await prisma.user.findFirst({
      where: { id: dto.ownerId, organizationId: orgId }
    });

    if (!owner) {
      throw new AppError(400, 'Invalid owner ID for the organization.', 'VALIDATION_FAILED');
    }

    const issue = await prisma.complianceIssue.create({
      data: {
        organizationId: orgId,
        auditId: dto.auditId || null,
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        ownerId: dto.ownerId,
        dueDate: new Date(dto.dueDate),
        status: IssueStatus.OPEN
      }
    });

    // Notify the owner
    await prisma.notification.create({
      data: {
        organizationId: orgId,
        userId: dto.ownerId,
        title: 'New Compliance Issue Assigned',
        message: `You have been assigned the compliance issue: "${dto.title}". Due date: ${dto.dueDate}`,
        type: 'COMPLIANCE'
      }
    });

    return issue;
  }

  static async resolveComplianceIssue(issueId: string, userId: string, orgId: string, resolutionDetails: string) {
    const issue = await prisma.complianceIssue.findFirst({
      where: { id: issueId, organizationId: orgId }
    });

    if (!issue) {
      throw new AppError(404, 'Compliance issue not found.', 'NOT_FOUND');
    }

    // Verify resolving user is either the assigned owner or an org admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    const isOwner = issue.ownerId === userId;
    const isAdmin = user?.role.name === 'ORG_ADMIN';

    if (!isOwner && !isAdmin) {
      throw new AppError(403, 'Permission denied. You do not own this issue.', 'FORBIDDEN');
    }

    const updatedIssue = await prisma.complianceIssue.update({
      where: { id: issueId },
      data: {
        status: IssueStatus.RESOLVED,
        resolutionDetails,
        resolvedAt: new Date()
      }
    });

    // Notify administrator
    await prisma.notification.create({
      data: {
        organizationId: orgId,
        userId: issue.ownerId, // notify assignment context
        title: 'Compliance Issue Resolved',
        message: `The compliance issue "${issue.title}" has been marked as resolved.`,
        type: 'COMPLIANCE'
      }
    });

    return updatedIssue;
  }

  /**
   * Sweeper check that runs nightly or manually to transition open issues to OVERDUE.
   */
  static async runOverdueCheck() {
    const overdueIssues = await prisma.complianceIssue.findMany({
      where: {
        status: { in: [IssueStatus.OPEN, IssueStatus.INVESTIGATING] },
        dueDate: { lt: new Date() }
      }
    });

    for (const issue of overdueIssues) {
      await prisma.complianceIssue.update({
        where: { id: issue.id },
        data: { status: IssueStatus.OVERDUE }
      });

      // Notify owner of escalations
      await prisma.notification.create({
        data: {
          organizationId: issue.organizationId,
          userId: issue.ownerId,
          title: 'ALERT: Compliance Issue Overdue',
          message: `The compliance issue "${issue.title}" was due on ${issue.dueDate.toDateString()} and is now overdue. Please review immediately.`,
          type: 'COMPLIANCE'
        }
      });
    }

    return overdueIssues.length;
  }
}
