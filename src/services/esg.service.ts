import { prisma } from '../config/database';

export class EsgService {
  /**
   * Calculates the overall ESG score for an organization.
   */
  static async calculateOrganizationEsg(orgId: string) {
    // 1. Get Environmental Score
    const envScore = await this.calculateEnvironmentalScore(orgId);

    // 2. Get Social Score
    const socialScore = await this.calculateSocialScore(orgId);

    // 3. Get Governance Score
    const govScore = await this.calculateGovernanceScore(orgId);

    // 4. Aggregate with default weights: E: 40%, S: 30%, G: 30%
    const weightE = 0.40;
    const weightS = 0.30;
    const weightG = 0.30;

    const overallScore = Math.round(
      (envScore * weightE) + (socialScore * weightS) + (govScore * weightG)
    );

    return {
      overallScore,
      environmental: envScore,
      social: socialScore,
      governance: govScore,
      weights: {
        environmental: weightE,
        social: weightS,
        governance: weightG
      }
    };
  }

  /**
   * Calculates Environmental Sub-Score
   */
  private static async calculateEnvironmentalScore(orgId: string): Promise<number> {
    // Get targets
    const targets = await prisma.reductionTarget.findMany({
      where: { organizationId: orgId, status: 'ACTIVE' }
    });

    if (targets.length === 0) return 80; // Baseline default if no active target defined

    let totalProgressPct = 0;

    for (const target of targets) {
      // Calculate total emissions logged in target period
      const logs = await prisma.carbonLog.aggregate({
        where: {
          organizationId: orgId,
          departmentId: target.departmentId || undefined,
          logDate: { gte: target.startDate, lte: target.endDate },
          status: 'APPROVED'
        },
        _sum: { calculatedCo2e: true }
      });

      const actualEmissions = Number(logs._sum.calculatedCo2e || 0);
      const baseline = Number(target.baselineValue);
      const targetVal = Number(target.targetValue);

      if (actualEmissions <= targetVal) {
        totalProgressPct += 100;
      } else if (actualEmissions >= baseline) {
        totalProgressPct += 0;
      } else {
        const totalGap = baseline - targetVal;
        const achieved = baseline - actualEmissions;
        totalProgressPct += totalGap > 0 ? (achieved / totalGap) * 100 : 0;
      }
    }

    return Math.round(totalProgressPct / targets.length);
  }

  /**
   * Calculates Social Sub-Score
   */
  private static async calculateSocialScore(orgId: string): Promise<number> {
    // 1. Volunteer hours rate (Target: 20 hours per employee per year)
    const employeesCount = await prisma.user.count({
      where: { organizationId: orgId, role: { name: 'EMPLOYEE' } }
    });

    if (employeesCount === 0) return 100;

    const totalHoursAggregate = await prisma.csrRegistration.aggregate({
      where: {
        csrActivity: { organizationId: orgId },
        approvalStatus: 'APPROVED'
      },
      _sum: { loggedHours: true }
    });

    const totalHours = Number(totalHoursAggregate._sum.loggedHours || 0);
    const avgHours = totalHours / employeesCount;
    const volunteerScore = Math.min(100, (avgHours / 20) * 100);

    // 2. Training completion (Mock factor: approved training registrations)
    const trainingRegistrations = await prisma.csrRegistration.count({
      where: {
        csrActivity: { organizationId: orgId, type: 'TRAINING' },
        approvalStatus: 'APPROVED'
      }
    });
    const totalTrainingAssigned = await prisma.csrRegistration.count({
      where: {
        csrActivity: { organizationId: orgId, type: 'TRAINING' }
      }
    });

    const trainingScore = totalTrainingAssigned > 0 ? (trainingRegistrations / totalTrainingAssigned) * 100 : 100;

    return Math.round((volunteerScore * 0.6) + (trainingScore * 0.4));
  }

  /**
   * Calculates Governance Sub-Score
   */
  private static async calculateGovernanceScore(orgId: string): Promise<number> {
    // 1. Policy sign-off rate
    const employeesCount = await prisma.user.count({
      where: { organizationId: orgId }
    });
    const activePoliciesCount = await prisma.policy.count({
      where: { organizationId: orgId, status: 'ACTIVE' }
    });

    const totalRequiredAcks = employeesCount * activePoliciesCount;
    let policyScore = 100;

    if (totalRequiredAcks > 0) {
      const actualAcks = await prisma.policyAcknowledgement.count({
        where: { policy: { organizationId: orgId, status: 'ACTIVE' } }
      });
      policyScore = (actualAcks / totalRequiredAcks) * 100;
    }

    // 2. Issue Resolution SLA Rate
    const totalIssues = await prisma.complianceIssue.count({
      where: { organizationId: orgId }
    });
    let slaScore = 100;

    if (totalIssues > 0) {
      const resolvedOnTime = await prisma.complianceIssue.count({
        where: {
          organizationId: orgId,
          status: 'RESOLVED',
          resolvedAt: { lte: prisma.complianceIssue.fields.dueDate }
        }
      });
      slaScore = (resolvedOnTime / totalIssues) * 100;
    }

    // 3. Audit average score
    const audits = await prisma.audit.aggregate({
      where: { organizationId: orgId, status: 'COMPLETED' },
      _avg: { score: true }
    });
    const auditScore = Number(audits._avg.score || 85); // default 85 if no audits yet

    return Math.round((policyScore * 0.40) + (slaScore * 0.30) + (auditScore * 0.30));
  }

  /**
   * Calculates ESG score for a single department
   */
  static async calculateDepartmentEsg(deptId: string) {
    const department = await prisma.department.findUnique({
      where: { id: deptId }
    });

    if (!department) throw new Error('Department not found');

    const orgId = department.organizationId;

    // Environmental (Department Logs vs Target)
    const logs = await prisma.carbonLog.aggregate({
      where: { departmentId: deptId, status: 'APPROVED' },
      _sum: { calculatedCo2e: true }
    });
    const deptEmissions = Number(logs._sum.calculatedCo2e || 0);

    // Social (Volunteer hours logged by employees in this department)
    const deptEmployeesCount = await prisma.user.count({
      where: { departmentId: deptId, role: { name: 'EMPLOYEE' } }
    });
    const totalHoursAggregate = await prisma.csrRegistration.aggregate({
      where: {
        user: { departmentId: deptId },
        approvalStatus: 'APPROVED'
      },
      _sum: { loggedHours: true }
    });
    const deptHours = Number(totalHoursAggregate._sum.loggedHours || 0);
    const avgHours = deptEmployeesCount > 0 ? deptHours / deptEmployeesCount : 0;
    const socialScore = Math.min(100, Math.round((avgHours / 20) * 100));

    // Simple Governance (Active compliance issues of department owner)
    const openIssues = await prisma.complianceIssue.count({
      where: { owner: { departmentId: deptId }, status: 'OPEN' }
    });
    const governanceScore = Math.max(0, 100 - (openIssues * 15));

    return {
      departmentName: department.name,
      emissions: deptEmissions,
      socialScore,
      governanceScore
    };
  }
}
