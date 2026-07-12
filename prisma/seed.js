"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding EcoSphere Database...');
    // 1. Roles
    const roles = [
        { id: 'b3017a1a-4d7a-4286-9a2c-2e65c5890201', name: 'SUPER_ADMIN', description: 'Platform-wide administrator with full cross-tenant control' },
        { id: 'b3017a1a-4d7a-4286-9a2c-2e65c5890202', name: 'ORG_ADMIN', description: 'Tenant administrator managing organization compliance, targets, and approvals' },
        { id: 'b3017a1a-4d7a-4286-9a2c-2e65c5890203', name: 'DEPT_MANAGER', description: 'Departmental supervisor logging operational data and reviewing departmental team logs' },
        { id: 'b3017a1a-4d7a-4286-9a2c-2e65c5890204', name: 'AUDITOR', description: 'Read-only access to auditing materials, compliance logs, and policy tracking' },
        { id: 'b3017a1a-4d7a-4286-9a2c-2e65c5890205', name: 'EMPLOYEE', description: 'Standard employee logging personal CSR efforts and participating in gamified challenges' }
    ];
    for (const role of roles) {
        await prisma.userRole.upsert({
            where: { name: role.name },
            update: {},
            create: role
        });
    }
    console.log('Roles seeded.');
    // 2. Organization
    const orgId = 'f40f09a1-0738-4b77-ad54-5e1654e8cb2f';
    await prisma.organization.upsert({
        where: { domain: 'ecocorp.com' },
        update: {},
        create: {
            id: orgId,
            name: 'EcoCorp Enterprises',
            domain: 'ecocorp.com',
            subscriptionTier: 'ENTERPRISE',
            isActive: true
        }
    });
    console.log('Organization seeded.');
    // 3. Departments
    const deptEng = await prisma.department.upsert({
        where: { organizationId_name: { organizationId: orgId, name: 'Engineering & IT' } },
        update: {},
        create: {
            id: 'a10e8d0e-26f6-4196-857e-9eb205777101',
            organizationId: orgId,
            name: 'Engineering & IT'
        }
    });
    const deptLog = await prisma.department.upsert({
        where: { organizationId_name: { organizationId: orgId, name: 'Logistics & Supply Chain' } },
        update: {},
        create: {
            id: 'a10e8d0e-26f6-4196-857e-9eb205777102',
            organizationId: orgId,
            name: 'Logistics & Supply Chain'
        }
    });
    console.log('Departments seeded.');
    // 4. Users
    const passwordHash = await bcrypt.hash('Password123', 10);
    const users = [
        {
            id: 'e10c73a8-d99f-4318-b2a6-b5257e2ff401',
            organizationId: orgId,
            roleId: 'b3017a1a-4d7a-4286-9a2c-2e65c5890202', // ORG_ADMIN
            email: 'admin@ecocorp.com',
            passwordHash,
            firstName: 'Sarah',
            lastName: 'Connor',
            xp: 0,
            level: 1,
            status: 'ACTIVE'
        },
        {
            id: 'e10c73a8-d99f-4318-b2a6-b5257e2ff402',
            organizationId: orgId,
            departmentId: deptEng.id,
            roleId: 'b3017a1a-4d7a-4286-9a2c-2e65c5890203', // DEPT_MANAGER
            email: 'manager.it@ecocorp.com',
            passwordHash,
            firstName: 'David',
            lastName: 'Lightman',
            xp: 500,
            level: 3,
            status: 'ACTIVE'
        },
        {
            id: 'e10c73a8-d99f-4318-b2a6-b5257e2ff403',
            organizationId: orgId,
            departmentId: deptEng.id,
            roleId: 'b3017a1a-4d7a-4286-9a2c-2e65c5890205', // EMPLOYEE
            email: 'dev.one@ecocorp.com',
            passwordHash,
            firstName: 'Alice',
            lastName: 'Smith',
            xp: 1250,
            level: 6,
            status: 'ACTIVE'
        },
        {
            id: 'e10c73a8-d99f-4318-b2a6-b5257e2ff404',
            organizationId: orgId,
            roleId: 'b3017a1a-4d7a-4286-9a2c-2e65c5890204', // AUDITOR
            email: 'auditor@ecosphere.com',
            passwordHash,
            firstName: 'Carl',
            lastName: 'Bernstein',
            xp: 0,
            level: 1,
            status: 'ACTIVE'
        }
    ];
    for (const u of users) {
        const existing = await prisma.user.findFirst({
            where: { email: u.email }
        });
        if (!existing) {
            const createdUser = await prisma.user.create({ data: u });
            // Create notification settings
            await prisma.userNotificationSetting.create({
                data: {
                    userId: createdUser.id,
                    emailCompliance: true,
                    emailChallenges: true,
                    emailApprovals: true,
                    inAppCompliance: true,
                    inAppChallenges: true,
                    inAppApprovals: true
                }
            });
        }
    }
    // Update department manager
    await prisma.department.update({
        where: { id: deptEng.id },
        data: { managerId: 'e10c73a8-d99f-4318-b2a6-b5257e2ff402' }
    });
    console.log('Users and Notification Settings seeded.');
    // 5. Global Emission Factors
    const factors = [
        {
            id: 'c000f09a-0001-44ab-b3c4-e816a75f1101',
            activityType: 'grid_electricity',
            category: 'SCOPE_2',
            factor: 0.000385,
            unit: 'tCO2e_per_kWh',
            source: 'EPA eGRID 2024',
            year: 2024
        },
        {
            id: 'c000f09a-0002-44ab-b3c4-e816a75f1102',
            activityType: 'natural_gas',
            category: 'SCOPE_1',
            factor: 0.005311,
            unit: 'tCO2e_per_therm',
            source: 'EPA GHG Emission Factors 2024',
            year: 2024
        },
        {
            id: 'c000f09a-0003-44ab-b3c4-e816a75f1103',
            activityType: 'diesel_fleet',
            category: 'SCOPE_1',
            factor: 0.010210,
            unit: 'tCO2e_per_gallon',
            source: 'EPA GHG Emission Factors 2024',
            year: 2024
        },
        {
            id: 'c000f09a-0004-44ab-b3c4-e816a75f1104',
            activityType: 'commercial_flight',
            category: 'SCOPE_3',
            factor: 0.000133,
            unit: 'tCO2e_per_passenger_mile',
            source: 'DEFRA Carbon Factors 2024',
            year: 2024
        }
    ];
    for (const f of factors) {
        const existing = await prisma.emissionFactor.findFirst({
            where: { organizationId: null, activityType: f.activityType, year: f.year }
        });
        if (!existing) {
            await prisma.emissionFactor.create({ data: f });
        }
    }
    console.log('Global Emission Factors seeded.');
    // 6. Badges
    const badges = [
        {
            id: 'd1110000-abcd-1234-9999-e12345678901',
            name: 'Carbon Crusher',
            description: 'Submit 10 verified carbon reduction logs',
            iconUrl: 'carbon-crusher',
            unlockRuleType: 'CARBON_REDUCTION_COUNT',
            unlockRuleValue: 10
        },
        {
            id: 'd1110000-abcd-1234-9999-e12345678902',
            name: 'Social Champion',
            description: 'Volunteer for at least 20 hours in CSR activities',
            iconUrl: 'social-champion',
            unlockRuleType: 'CSR_HOURS_THRESHOLD',
            unlockRuleValue: 20
        },
        {
            id: 'd1110000-abcd-1234-9999-e12345678903',
            name: 'Compliance Guardian',
            description: 'Acknowledge all active policy updates',
            iconUrl: 'compliance-guardian',
            unlockRuleType: 'POLICY_READ_ALL',
            unlockRuleValue: 1
        }
    ];
    for (const b of badges) {
        const existing = await prisma.badge.findFirst({
            where: { name: b.name }
        });
        if (!existing) {
            await prisma.badge.create({ data: b });
        }
    }
    console.log('Badges seeded.');
    console.log('EcoSphere database seeding completed successfully.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
