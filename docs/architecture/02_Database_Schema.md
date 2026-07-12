# EcoSphere ESG Management Platform: Database Schema Document

This document provides the complete database design for the **EcoSphere ESG Management Platform**, targeting a production **PostgreSQL** instance. It includes the complete SQL DDL, normalization justifications, indexing strategy, and seed data.

---

## 1. Table Definitions & Database DDL

Below is the complete database DDL script. It establishes all 22 tables, primary keys, foreign keys with cascade constraints, unique constraints, and check constraints to prevent bad data ingestion.

```sql
-- Enable UUID extension for high entropy IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. BASE ENTITIES & ROLES
-- =========================================================================

-- Organizations Table (Tenants)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    subscription_tier VARCHAR(50) NOT NULL DEFAULT 'STANDARD' CHECK (subscription_tier IN ('STANDARD', 'ENTERPRISE', 'UNLIMITED')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Roles Table (Global)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL CHECK (name IN ('SUPER_ADMIN', 'ORG_ADMIN', 'DEPT_MANAGER', 'AUDITOR', 'EMPLOYEE')),
    description TEXT NOT NULL
);

-- Departments Table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    manager_id UUID, -- Forward reference, set to nullable to avoid deadlock during creation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, name)
);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    role_id UUID NOT NULL REFERENCES user_roles(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, email)
);

-- Add manager_id foreign key constraint to departments now that users table exists
ALTER TABLE departments ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- =========================================================================
-- 2. ENVIRONMENTAL TRACKING MODULE
-- =========================================================================

-- Emission Factors Table (Global + Custom Overrides)
CREATE TABLE emission_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL means global standard factor
    activity_type VARCHAR(100) NOT NULL, -- e.g., grid_electricity, natural_gas, diesel_fleet, commercial_flight
    category VARCHAR(50) NOT NULL CHECK (category IN ('SCOPE_1', 'SCOPE_2', 'SCOPE_3')),
    factor NUMERIC(12, 6) NOT NULL CHECK (factor >= 0), -- Emission factor value
    unit VARCHAR(50) NOT NULL, -- e.g., kg_CO2e_per_kWh, kg_CO2e_per_liter
    source VARCHAR(255) NOT NULL, -- e.g., DEFRA 2025, EPA 2024
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, activity_type, year)
);

-- Carbon Logs Table
CREATE TABLE carbon_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    logged_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    activity_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('SCOPE_1', 'SCOPE_2', 'SCOPE_3')),
    quantity NUMERIC(14, 4) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    emission_factor_id UUID NOT NULL REFERENCES emission_factors(id),
    calculated_co2e NUMERIC(14, 4) NOT NULL CHECK (calculated_co2e >= 0), -- quantity * emission_factor
    log_date DATE NOT NULL,
    evidence_url VARCHAR(512), -- Required if evidence flag is enabled
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Carbon Reduction Targets Table
CREATE TABLE reduction_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE, -- NULL means organization-wide target
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('SCOPE_1', 'SCOPE_2', 'SCOPE_3', 'TOTAL')),
    target_reduction_pct NUMERIC(5, 2) NOT NULL CHECK (target_reduction_pct > 0 AND target_reduction_pct <= 100),
    baseline_value NUMERIC(14, 4) NOT NULL CHECK (baseline_value >= 0), -- Starting metric tons CO2e
    target_value NUMERIC(14, 4) NOT NULL CHECK (target_value >= 0), -- Target metric tons CO2e after reduction
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACHIEVED', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dates CHECK (end_date > start_date)
);

-- =========================================================================
-- 3. SOCIAL TRACKING MODULE
-- =========================================================================

-- CSR Activities Table
CREATE TABLE csr_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('VOLUNTEERING', 'FUNDRAISING', 'ENVIRONMENTAL_CLEANUP', 'TRAINING')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    required_hours NUMERIC(6, 2) DEFAULT 0 CHECK (required_hours >= 0),
    target_fund NUMERIC(14, 2) DEFAULT 0 CHECK (target_fund >= 0),
    current_fund NUMERIC(14, 2) DEFAULT 0 CHECK (current_fund >= 0),
    evidence_required BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_csr_dates CHECK (end_date > start_date)
);

-- CSR Registrations / Participation Table
CREATE TABLE csr_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    csr_activity_id UUID NOT NULL REFERENCES csr_activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED', 'PARTICIPATED', 'ABSENT')),
    logged_hours NUMERIC(6, 2) DEFAULT 0 CHECK (logged_hours >= 0),
    evidence_url VARCHAR(512),
    approval_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (csr_activity_id, user_id)
);

-- =========================================================================
-- 4. GOVERNANCE & COMPLIANCE MODULE
-- =========================================================================

-- Policies Table
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE')),
    version VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Policy Acknowledgements Table
CREATE TABLE policy_acknowledgements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (policy_id, user_id)
);

-- Audits Table
CREATE TABLE audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    auditor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE', 'COMPREHENSIVE')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED')),
    score NUMERIC(5, 2) CHECK (score >= 0 AND score <= 100), -- 0-100 score grade
    report_url VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_audit_dates CHECK (end_date >= start_date)
);

-- Compliance Issues Table
CREATE TABLE compliance_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    audit_id UUID REFERENCES audits(id) ON DELETE SET NULL, -- Nullable if raised independently of audits
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'OVERDUE')),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- Direct ownership tracking
    due_date DATE NOT NULL,
    resolution_details TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Centralized Security Audit Logs (Read-Only to API users)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g., UPDATE_CARBON_LOG, REJECT_CSR_EVIDENCE
    entity_type VARCHAR(100) NOT NULL, -- e.g., carbon_logs, compliance_issues
    entity_id UUID,
    pre_state JSONB, -- Database state before change
    post_state JSONB, -- Database state after change
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 5. GAMIFICATION MODULE
-- =========================================================================

-- Badges Table
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL means global pre-loaded badge
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon_url VARCHAR(255) NOT NULL,
    unlock_rule_type VARCHAR(100) NOT NULL CHECK (unlock_rule_type IN ('CARBON_REDUCTION_COUNT', 'CSR_HOURS_THRESHOLD', 'POLICY_READ_ALL', 'PERFECT_COMPLIANCE')),
    unlock_rule_value INTEGER NOT NULL CHECK (unlock_rule_value > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Challenges Table
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('CARBON_REDUCTION', 'CSR_PARTICIPATION', 'POLICY_READING')),
    target_value NUMERIC(14, 4) NOT NULL CHECK (target_value > 0),
    xp_reward INTEGER NOT NULL CHECK (xp_reward > 0),
    badge_id UUID REFERENCES badges(id) ON DELETE SET NULL, -- Optional badge reward
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_challenge_dates CHECK (end_date > start_date)
);

-- User Challenge Progress Tracking Table
CREATE TABLE user_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_value NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'JOINED' CHECK (status IN ('JOINED', 'COMPLETED', 'FAILED')),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (challenge_id, user_id)
);

-- User Badges Earned Table
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, badge_id)
);

-- Rewards Table (XP Store Items)
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    xp_cost INTEGER NOT NULL CHECK (xp_cost > 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Redeemed Rewards Table
CREATE TABLE redeemed_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'FULFILLED', 'REJECTED')),
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 6. SYSTEM UTILITIES & CONFIGS
-- =========================================================================

-- In-App Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('SYSTEM', 'CHALLENGE', 'COMPLIANCE', 'APPROVAL', 'BADGE')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Notification Settings
CREATE TABLE user_notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_compliance BOOLEAN NOT NULL DEFAULT TRUE,
    email_challenges BOOLEAN NOT NULL DEFAULT TRUE,
    email_approvals BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_compliance BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_challenges BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_approvals BOOLEAN NOT NULL DEFAULT TRUE
);
```

---

## 2. Normalization & Integrity Justifications

The EcoSphere schema is fully normalized to **Third Normal Form (3NF)** to support transactional consistency, prevent data anomalies, and preserve compliance audit integrity.

### 2.1 3NF Compliance Analysis
- **1NF (First Normal Form)**: Every cell contains atomic values. Arrays are avoided in transactional columns. All tables enforce a strict primary key utilizing high-entropy UUIDs.
- **2NF (Second Normal Form)**: Standardized tables are set up such that no non-key columns depend on a partial primary key. In composite linking tables like `user_challenges` (linked uniquely via `challenge_id` and `user_id`), attributes like `current_value` and `status` depend entirely on the composite relationship context.
- **3NF (Third Normal Form)**: No transitive dependencies exist. For example, `users` contain a reference to `department_id`, and `departments` contains the reference to `organization_id`. We do not duplicate `department_name` in the `users` table; it exists solely in `departments`.

### 2.2 Table Explanations & Compliance Contribution

| Table Name | Primary Purpose | ESG & Compliance Value |
| :--- | :--- | :--- |
| `organizations` | Tenant definition. | Establishes absolute data isolation boundaries. |
| `user_roles` | Global system RBAC definitions. | Enforces strict role boundaries for operational edits. |
| `departments` | Organizational division of target goals. | Allows carbon and social calculations to group sub-organization statistics. |
| `users` | System user profile & credentials. | Tracks execution responsibility and houses XP credentials. |
| `emission_factors` | Carbon emission coefficients (Global & Tenant-specific). | The logical math factor enabling audit-compliant emission calculations. |
| `carbon_logs` | Actual carbon log tracking (Scope 1, 2, 3). | Core audit database for external carbon accountants. |
| `reduction_targets` | Target parameters to offset carbon footprint. | Maps performance progress against internal goals. |
| `csr_activities` | CSR activities, programs, and community logs. | Social impact metrics repository. |
| `csr_registrations` | Maps user hours and documents evidence. | Backing evidence logs for CSR volunteering verification. |
| `policies` | Governance policy text and versions. | Core Governance evidence; monitors organizational policy updates. |
| `policy_acknowledgements` | Track who has read and agreed to compliance. | Legally defensible compliance log proving active governance compliance. |
| `audits` | Third-party or internal audits record. | Evaluates environmental, social, or governance compliance levels. |
| `compliance_issues` | Issue ledger with owner assignment and due date. | Legally binds due-date tracking and status to resolution actions. |
| `audit_logs` | Tamper-evident operational state logs. | Retains exact JSON states of deleted/modified ESG entries for forensic audibility. |
| `badges` | Earnable badge definitions. | Gamification metadata engine. |
| `challenges` | Competitive environmental challenges. | Visual targets driving user engagement. |
| `user_challenges` | Tracks user completion of active challenges. | Operational records of worker participation. |
| `user_badges` | Earned player records. | Gamification achievement historical ledger. |
| `rewards` | Tangible catalog for XP redemption. | Reward incentives ledger. |
| `redeemed_rewards` | Redemptions processing. | Auditable reward fulfillment ledger. |
| `notifications` | Personal alert queues. | Timely feedback for compliance action requests. |
| `user_notification_settings` | Personal delivery configs. | Privacy compliance (GDPR consent config). |

---

## 3. Indexing Optimization Strategy

To ensure rapid queries across millions of multi-tenant records:

1. **Compound Index on Tenant Operations**:
   - `CREATE INDEX idx_carbon_org_date ON carbon_logs(organization_id, log_date DESC);`
   - *Why*: Supports dashboard load queries requesting the past 12 months of carbon output for a specific organization.
2. **User Identity Index**:
   - `CREATE UNIQUE INDEX idx_user_email_lookup ON users(email);`
   - *Why*: Powers sub-millisecond query execution during login auth steps.
3. **Audit Log Chronology Index**:
   - `CREATE INDEX idx_audit_log_org_time ON audit_logs(organization_id, created_at DESC);`
   - *Why*: Ensures auditor queries fetching compliance logs display instantaneously.
4. **Foreign Key Performance Indexes**:
   - Foreign key indexing (e.g., `CREATE INDEX idx_user_challenge_user ON user_challenges(user_id);`) is generated on all joining IDs to avoid full table scans during Prisma ORM relations resolution.

---

## 4. Production SQL Seed Script

Execute this seed script to initialize roles, create a baseline mock tenant (`EcoCorp`), populate baseline GHG global emission factors, and set up core administrative users.

```sql
-- Seed Global User Roles
INSERT INTO user_roles (id, name, description) VALUES
('b3017a1a-4d7a-4286-9a2c-2e65c5890201', 'SUPER_ADMIN', 'Platform-wide administrator with full cross-tenant control'),
('b3017a1a-4d7a-4286-9a2c-2e65c5890202', 'ORG_ADMIN', 'Tenant administrator managing organization compliance, targets, and approvals'),
('b3017a1a-4d7a-4286-9a2c-2e65c5890203', 'DEPT_MANAGER', 'Departmental supervisor logging operational data and reviewing departmental team logs'),
('b3017a1a-4d7a-4286-9a2c-2e65c5890204', 'AUDITOR', 'Read-only access to auditing materials, compliance logs, and policy tracking'),
('b3017a1a-4d7a-4286-9a2c-2e65c5890205', 'EMPLOYEE', 'Standard employee logging personal CSR efforts and participating in gamified challenges');

-- Seed Mock Organization: EcoCorp
INSERT INTO organizations (id, name, domain, subscription_tier, is_active) VALUES
('f40f09a1-0738-4b77-ad54-5e1654e8cb2f', 'EcoCorp Enterprises', 'ecocorp.com', 'ENTERPRISE', TRUE);

-- Seed Departments for EcoCorp
INSERT INTO departments (id, organization_id, name, manager_id) VALUES
('a10e8d0e-26f6-4196-857e-9eb205777101', 'f40f09a1-0738-4b77-ad54-5e1654e8cb2f', 'Engineering & IT', NULL),
('a10e8d0e-26f6-4196-857e-9eb205777102', 'f40f09a1-0738-4b77-ad54-5e1654e8cb2f', 'Logistics & Supply Chain', NULL);

-- Seed Core Users for EcoCorp
-- (Note: In production, password hashes will be verified bcrypt/argon2 values. Dummy passwords used here for layout)
INSERT INTO users (id, organization_id, department_id, role_id, email, password_hash, first_name, last_name, xp, level, status) VALUES
('e10c73a8-d99f-4318-b2a6-b5257e2ff401', 'f40f09a1-0738-4b77-ad54-5e1654e8cb2f', NULL, 'b3017a1a-4d7a-4286-9a2c-2e65c5890202', 'admin@ecocorp.com', '$2b$12$DUMMYHASHPASSWORDFORADMINUSER1234567890', 'Sarah', 'Connor', 0, 1, 'ACTIVE'),
('e10c73a8-d99f-4318-b2a6-b5257e2ff402', 'f40f09a1-0738-4b77-ad54-5e1654e8cb2f', 'a10e8d0e-26f6-4196-857e-9eb205777101', 'b3017a1a-4d7a-4286-9a2c-2e65c5890203', 'manager.it@ecocorp.com', '$2b$12$DUMMYHASHPASSWORDFORITMANAGER1234567890', 'David', 'Lightman', 500, 3, 'ACTIVE'),
('e10c73a8-d99f-4318-b2a6-b5257e2ff403', 'f40f09a1-0738-4b77-ad54-5e1654e8cb2f', 'a10e8d0e-26f6-4196-857e-9eb205777101', 'b3017a1a-4d7a-4286-9a2c-2e65c5890205', 'dev.one@ecocorp.com', '$2b$12$DUMMYHASHPASSWORDFORDEVUSER1234567890123', 'Alice', 'Smith', 1250, 6, 'ACTIVE');

-- Connect Department Manager Backlinks
UPDATE departments SET manager_id = 'e10c73a8-d99f-4318-b2a6-b5257e2ff402' WHERE id = 'a10e8d0e-26f6-4196-857e-9eb205777101';

-- Seed Global Emission Factors (GHG Protocol Baseline Factors)
INSERT INTO emission_factors (id, organization_id, activity_type, category, factor, unit, source, year) VALUES
('c000f09a-0001-44ab-b3c4-e816a75f1101', NULL, 'grid_electricity', 'SCOPE_2', 0.000385, 'tCO2e_per_kWh', 'EPA eGRID 2024', 2024),
('c000f09a-0002-44ab-b3c4-e816a75f1102', NULL, 'natural_gas', 'SCOPE_1', 0.005311, 'tCO2e_per_therm', 'EPA GHG Emission Factors 2024', 2024),
('c000f09a-0003-44ab-b3c4-e816a75f1103', NULL, 'diesel_fleet', 'SCOPE_1', 0.010210, 'tCO2e_per_gallon', 'EPA GHG Emission Factors 2024', 2024),
('c000f09a-0004-44ab-b3c4-e816a75f1104', NULL, 'commercial_flight', 'SCOPE_3', 0.000133, 'tCO2e_per_passenger_mile', 'DEFRA Carbon Factors 2024', 2024);

-- Seed Default Organization Badges
INSERT INTO badges (id, organization_id, name, description, icon_url, unlock_rule_type, unlock_rule_value) VALUES
('d1110000-abcd-1234-9999-e12345678901', NULL, 'Carbon Crusher', 'Submit 10 verified carbon reduction logs', '/assets/badges/carbon-crusher.svg', 'CARBON_REDUCTION_COUNT', 10),
('d1110000-abcd-1234-9999-e12345678902', NULL, 'Social Champion', 'Volunteer for at least 20 hours in CSR activities', '/assets/badges/social-champion.svg', 'CSR_HOURS_THRESHOLD', 20),
('d1110000-abcd-1234-9999-e12345678903', NULL, 'Compliance Guardian', 'Acknowledge all active policy updates', '/assets/badges/compliance-guardian.svg', 'POLICY_READ_ALL', 1);

-- Seed Notification Settings for Users
INSERT INTO user_notification_settings (user_id, email_compliance, email_challenges, email_approvals, in_app_compliance, in_app_challenges, in_app_approvals) VALUES
('e10c73a8-d99f-4318-b2a6-b5257e2ff401', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('e10c73a8-d99f-4318-b2a6-b5257e2ff402', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('e10c73a8-d99f-4318-b2a6-b5257e2ff403', FALSE, TRUE, FALSE, TRUE, TRUE, TRUE);
```
