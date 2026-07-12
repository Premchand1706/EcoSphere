# EcoSphere ESG Management Platform: Module Breakdown & Calculations

This document details the functional specifications, calculation algorithms, and business logic for the four core modules of **EcoSphere**: Environmental, Social, Governance, and Gamification.

---

## 1. Environmental Module & Carbon Calculations

The Environmental Module monitors greenhouse gas (GHG) footprint tracking, emission factor correlation, and carbon target progression.

### 1.1 Carbon Calculations (GHG Protocol Standards)
Emissions are classified into Scope 1 (Direct), Scope 2 (Indirect), and Scope 3 (Value Chain). The calculation engine computes emissions dynamically when a log is created or updated:

$$\text{Emissions } (t\text{CO}_2\text{e}) = \frac{\text{Activity Quantity} \times \text{Emission Factor}}{1000} \text{ (if Factor is in kg)}$$

Or simply:

$$E = Q \times EF$$

Where:
- $E$ is the calculated carbon output in metric tons of $CO_2$ equivalent ($tCO_2e$).
- $Q$ is the activity quantity (e.g., kWh of electricity, liters of fuel, passenger miles).
- $EF$ is the specific emission factor coefficient retrieved from `emission_factors` matching the activity and calendar year.

#### Scope Mapping Schema:
- **Scope 1 (Direct Combustion)**:
  - *Activities*: Fleet diesel consumption, office natural gas combustion, refrigerants.
  - *Variables*: Gallons of fuel, therms of gas.
- **Scope 2 (Indirect Purchased Energy)**:
  - *Activities*: Purchased grid electricity, district heating.
  - *Variables*: Kilowatt-hours (kWh).
- **Scope 3 (Indirect Value Chain)**:
  - *Activities*: Commercial flights, employee commuting, waste disposal, postal shipping.
  - *Variables*: Passenger miles, short tons of waste.

### 1.2 Target Progression Metrics
Organizations set annual target thresholds. The system tracks the reduction progress $P_{target}$ of an active target:

$$P_{target} = \max\left(0, \min\left(100, \left( \frac{E_{baseline} - E_{actual}}{E_{baseline} - E_{target}} \right) \times 100 \right)\right)$$

Where:
- $E_{baseline}$: Total emissions during the historical baseline reference year.
- $E_{target}$: Target emission quantity in metric tons (calculated as $E_{baseline} \times (1 - \text{target\_reduction\_pct} / 100)$).
- $E_{actual}$: Cumulative emissions generated in the current target duration window.

---

## 2. Social Module

The Social Module measures employee engagement, community contribution, corporate social responsibility (CSR) programs, and workplace metrics.

### 2.1 Core Metrics Managed
1. **CSR Volunteer Hours**: Sum of all approved `logged_hours` in the `csr_registrations` table.
2. **Fundraising Goals**: Percentage progress towards charity funds:
   $$\text{Fundraising Progress} = \left(\frac{\text{current\_fund}}{\text{target\_fund}}\right) \times 100$$
3. **Training & Education**: Average sustainability/safety training hours logged per worker:
   $$\text{Average Training Hours} = \frac{\text{Total approved training hours logged}}{\text{Total active users in organization}}$$

### 2.2 Evidence Requirement Toggle
- CSR activities have an `evidence_required` boolean flag.
- When `TRUE`, registrations cannot be marked as `PARTICIPATED` and approved for XP/hours unless the user uploads a document or image to `evidence_url` (e.g., photo of volunteer badge, charity receipt).
- Approvals must be reviewed and signed off by the `ORG_ADMIN` or designated `DEPT_MANAGER`.

---

## 3. Governance Module

The Governance Module guarantees compliance with corporate policy, external audits, and remediation of regulatory issues.

### 3.1 Policy Administration & Acknowledgments
- New compliance documents are uploaded as `policies` with active version control (e.g., `v1.0`, `v1.1`).
- When a policy status changes to `ACTIVE`, the database triggers notification entries, requiring all assigned staff to review the text.
- Users click an acknowledgment button which writes a unique row to `policy_acknowledgements`.
- **Policy Compliance Rate ($R_{policy}$)**:
  $$R_{policy} = \frac{\text{Count of unique policy acknowledgments in active period}}{\text{Total active employees} \times \text{Total active policies}} \times 100$$

### 3.2 Audit & Issue Resolution SLA Tracking
- Compliance audits are conducted periodically. Findings generate items in the `compliance_issues` table.
- Each issue must have an assigned owner and a strict `due_date`.
- **SLA Resolution Rate ($R_{sla}$)**:
  $$R_{sla} = \frac{\text{Resolved Issues before Due Date}}{\text{Total Closed Issues}} \times 100$$
- If `CURRENT_DATE > due_date` and `status != 'RESOLVED'`, the system automatically transitions the issue status to `OVERDUE` and alerts the compliance administrator.

---

## 4. ESG Scoring & Weighting Engine

The overall ESG rating of an organization or department is represented as a score out of 100.

### 4.1 Scoring Formula (Organization Level)

$$\text{Score}_{ESG} = (W_E \times S_E) + (W_S \times S_S) + (W_G \times S_G)$$

Where:
- $W_E, W_S, W_G$ represent the weights assigned to Environmental, Social, and Governance sections. (Defaults: $W_E = 0.40, W_S = 0.30, W_G = 0.30$. Weight sum must equal $1.00$).
- $S_E, S_S, S_G$ are the sub-scores calculated out of 100:

#### 1. Environmental Sub-Score ($S_E$):
Calculated based on target progress and reduction efficiency:
$$S_E = \left( 0.70 \times P_{target\_overall} \right) + \left( 0.30 \times \text{Scope Efficiency Score} \right)$$
- If overall carbon reduction target is met, $P_{target\_overall} = 100$.
- Scope Efficiency Score evaluates if absolute emissions decreased year-over-year:
  $$\text{Scope Efficiency} = \max\left(0, \min\left(100, \left(1 - \frac{E_{\text{current\_year}}}{E_{\text{previous\_year}}}\right) \times 100\right)\right)$$

#### 2. Social Sub-Score ($S_S$):
Calculated from CSR volunteerism rates and training coverage:
$$S_S = (0.50 \times \text{CSR Hour Target Rate}) + (0.50 \times \text{Average Volunteer Rate})$$
- *CSR Hour Target Rate*: $\min(100, (\text{Average Hours Per Employee} / 20) \times 100)$ (Targeting 20 hours/employee/year).
- *Average Volunteer Rate*: $\frac{\text{Employees with } \ge 1\text{ volunteer hour}}{\text{Total Employees}} \times 100$.

#### 3. Governance Sub-Score ($S_G$):
Calculated from compliance audit reviews and policy sign-offs:
$$S_G = (0.40 \times R_{policy}) + (0.40 \times \text{Latest Audit Score}) + (0.20 \times R_{sla})$$

### 4.2 Departmental ESG Score Aggregation
Departmental calculations evaluate localized performance:
- Uses only the logs, targets, and employee profiles linked to that specific `department_id`.
- Permits internal benchmarking (e.g., displaying which division leads in ESG compliance).

---

## 5. Gamification Logic & XP Engine

To foster employee engagement, EcoSphere uses gamified rewards.

### 5.1 Experience Points (XP) Earning Rules

| Event Action | Trigger Event | XP Awarded | Limit |
| :--- | :--- | :--- | :--- |
| **Log Carbon Data** | Carbon log moves to `APPROVED` status. | `+50 XP` | Max 500 XP per month |
| **CSR Volunteering** | CSR participation marked `APPROVED`. | `+100 XP` per hour | No limit |
| **CSR Fundraising** | Contribution logged and approved. | `+1 XP` per \$1 donated | Max 1000 XP per event |
| **Policy Sign-off** | Policy marked as acknowledged by user. | `+150 XP` | Once per policy version |
| **Challenge Completed** | `user_challenges` moves to `COMPLETED`. | `+500 XP` | Varies per challenge |

### 5.2 User Level Progression
Level ($L$) is derived directly from accumulated XP ($XP$) via the following logarithmic scaling formula:

$$L = \lfloor 1 + \sqrt{\frac{XP}{100}} \rfloor$$

Example progression checkpoints:
- Level 1: 0 XP
- Level 2: 100 XP
- Level 3: 400 XP
- Level 4: 900 XP
- Level 10: 8100 XP

### 5.3 Automated Badge Awarding Algorithm
When any transaction is approved, a background worker is queued to check for badge unlocks:

```typescript
async function checkBadgeUnlock(userId: string, orgId: string) {
  // 1. Retrieve all badges not yet unlocked by this user
  const lockedBadges = await prisma.badges.findMany({
    where: {
      organization_id: { in: [orgId, null] }, // Global + Org-specific
      user_badges: { none: { user_id: userId } }
    }
  });

  for (const badge of lockedBadges) {
    let unlocked = false;

    // 2. Evaluate rule parameters based on type
    switch (badge.unlock_rule_type) {
      case 'CARBON_REDUCTION_COUNT': {
        const approvedLogsCount = await prisma.carbon_logs.count({
          where: { logged_by: userId, status: 'APPROVED' }
        });
        unlocked = approvedLogsCount >= badge.unlock_rule_value;
        break;
      }
      case 'CSR_HOURS_THRESHOLD': {
        const totalHoursAggregate = await prisma.csr_registrations.aggregate({
          where: { user_id: userId, approval_status: 'APPROVED' },
          _sum: { logged_hours: true }
        });
        const hoursLogged = Number(totalHoursAggregate._sum.logged_hours || 0);
        unlocked = hoursLogged >= badge.unlock_rule_value;
        break;
      }
      case 'POLICY_READ_ALL': {
        const activePolicyCount = await prisma.policies.count({
          where: { organization_id: orgId, status: 'ACTIVE' }
        });
        const signedPolicyCount = await prisma.policy_acknowledgements.count({
          where: { user_id: userId, policy: { status: 'ACTIVE' } }
        });
        unlocked = activePolicyCount > 0 && signedPolicyCount === activePolicyCount;
        break;
      }
      case 'PERFECT_COMPLIANCE': {
        const totalAssignedIssues = await prisma.compliance_issues.count({
          where: { owner_id: userId }
        });
        const overdueIssues = await prisma.compliance_issues.count({
          where: { owner_id: userId, status: 'OVERDUE' }
        });
        unlocked = totalAssignedIssues > 0 && overdueIssues === 0;
        break;
      }
    }

    // 3. Persist unlocked badge and publish event
    if (unlocked) {
      await prisma.user_badges.create({
        data: { user_id: userId, badge_id: badge.id }
      });
      await createNotification(userId, badge.organization_id, {
        title: "New Badge Unlocked!",
        message: `Congratulations! You unlocked the "${badge.name}" badge.`,
        type: "BADGE"
      });
    }
  }
}
```

### 5.4 XP Store & Rewards Redemption Workflow
1. **Submission**: User requests redemption for a reward item (e.g., "Eco-friendly Water Bottle" for 1000 XP).
2. **Prerequisites Verification**:
   - Check reward stock: `stock > 0` and status is `ACTIVE`.
   - Check user points: `users.xp >= reward.xp_cost`.
3. **Execution Transaction**:
   - Run inside a PostgreSQL transaction to prevent race conditions:
     - Deduct XP cost from user account.
     - Decrement stock count by 1.
     - Insert a record into `redeemed_rewards` with status `PENDING`.
4. **Approval & Resolution**:
   - Organization Administrator reviews requests.
   - If approved, status transitions to `FULFILLED` (fulfilled by distribution team).
   - If rejected (e.g., reward discontinued), status transitions to `REJECTED`, and the system refunds the XP back to the user account.
