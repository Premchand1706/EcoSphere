# EcoSphere ESG Management Platform: UI & Workflows Document

This document outlines the UI page hierarchy, executive dashboard widget specifications, entity state machine workflows, reports parameters, and notification flows.

---

## 1. UI Screen Catalog & Layout Blueprints

The frontend React application is structured into distinct, modular layouts for authenticated vs. public views.

### 1.1 Shell Layouts
- **AuthLayout**: Centered minimal grid containing authentication components with modern gradient backdrops.
- **AppLayout**: Standard desktop shell containing a persistent left sidebar navigation (collapsible), top banner header (showing tenant organization, user avatar, level, and active XP), and a main scrollable content panel.

### 1.2 View Directory

#### 1. Login & Tenant Entry Screen
- **Visual Design**: Sleek glassmorphism card over a dark dynamic background.
- **Fields**: Subdomain prefix validation (e.g., `ecocorp.ecosphere.io`), email input, password input.
- **Actions**: Login dispatch, redirect to forgot password page, OAuth links if enabled.

#### 2. Unified ESG Executive Dashboard
- **Visual Design**: Multi-column grid containing real-time ESG metrics.
- **Components**:
  - **ESG Combined Score Widget**: Radial progress ring indicating overall ESG score (0-100) with positive/negative trend indicator (+3.4% MoM).
  - **KPI Cards**: Three distinct indicators:
    - *Carbon Footprint*: Scope 1/2/3 total emissions ($tCO_2e$) and target progress.
    - *CSR Hours*: Total hours and employee participation rate.
    - *Compliance Status*: Count of active policies and outstanding compliance issues.
  - **MoM Carbon Trend (Scope 1, 2, 3)**: Stacked Area chart representing emissions monthly progress.
  - **Active Policy Compliance Panel**: Progress bars indicating acknowledgement rate for recently published policies.
  - **Active Compliance Issues Summary**: Mini-board showing "High" and "Critical" issues with countdown due dates.

#### 3. Environmental Log Center
- **Visual Design**: Data table + side panel form layout.
- **Actions**:
  - "Log Carbon Activity" button triggers modal: activity selector (e.g. utility invoice), quantity input, date, factor linking, and evidence file attachment.
  - Tabbed tables: "Pending Approvals", "Approved History", "Targets Registry".

#### 4. CSR Volunteering & Social Portal
- **Visual Design**: Grid of activity cards + profile summary.
- **Actions**:
  - Employee: Browse active CSR events (e.g. tree planting), register, upload attendance timesheet images to redeem hours.
  - Admin: Create a new CSR program, toggle `evidence_required`, review registration submissions.

#### 5. Governance & Audit Desk
- **Visual Design**: Compliance register layout.
- **Components**:
  - **Policy Tracker**: List of active policies requiring employee sign-offs (with visual sign-off buttons).
  - **Audit Records**: List of audits conducted, audit score ratings, and PDF report downloads.
  - **Compliance Board**: Kanban board layout for issues (`OPEN`, `INVESTIGATING`, `RESOLVED`, `OVERDUE`).

#### 6. Gamification Arena
- **Visual Design**: Dashboard displaying levels and achievements.
- **Components**:
  - **Player Profile Card**: Level ring, dynamic XP progression bar (XP required to level up), inventory of earned badges.
  - **Leaderboards**: Tabbed component swapping between:
    - *Individual Leaderboard*: Scrollable list of top-performing users.
    - *Department Leaderboard*: Rankings sorted by average XP per department member.
  - **XP Rewards Shop**: Grid displaying items (e.g. "Tree Planted in Your Name"), stock indicator, "Redeem" button (disabled if XP is insufficient).

---

## 2. Dashboard Widgets Specification

To deliver executive dashboard experiences, widgets are specified with strict chart and telemetry data requirements:

### 2.1 Carbon Trend Chart
- **Visual Component**: Recharts Stacked Area Chart.
- **Telemetry Query**: Monthly sum of `calculated_co2e` grouped by `category` (Scope 1, Scope 2, Scope 3) over the past 12 months.
- **Interaction**: Hovering displays tooltip listing individual Scope breakdowns and total tons.

### 2.2 CSR Department Rank Bar Chart
- **Visual Component**: Recharts Horizontal Bar Chart.
- **Telemetry Query**: Sum of approved `logged_hours` in `csr_registrations` grouped by `department_id`, sorted descending.
- **Interaction**: Displays department name and aggregate volunteer hours.

### 2.3 Policy Acknowledgment Progress Ring
- **Visual Component**: Recharts Radial Bar Chart.
- **Telemetry Query**: Percentage of active users that have signed off on all currently active `policies`.

### 2.4 Compliance Issue Severity KPI Card
- **Visual Component**: Priority matrix grid.
- **Telemetry Query**: Count of open `compliance_issues` grouped by `severity` (Critical, High, Medium, Low).
- **Interaction**: Clicking alerts routes the user to the filtered list on the Governance screen.

---

## 3. Transactional Entity State Machines

Transactional records trace distinct lifecycles governed by state transition validations.

### 3.1 Challenges Lifecycle
```
[ DRAFT ] ──► (Publish) ──► [ ACTIVE ] ──► (End Date Reached) ──► [ COMPLETED ]
    │                            │
    │                            └──► (Cancel) ──────────────────► [ CANCELLED ]
    ▼
(Delete) ──► [ PURGED ]
```
- **Rule**: Users can only join or contribute progress to challenges in the `ACTIVE` state.

### 3.2 CSR Participation Registration Lifecycle
```
[ REGISTERED ] ──► (Log Hours & Evidence) ──► [ PENDING APPROVAL ]
       │                                              │
       ├──► (Absent) ──► [ ABSENT ]                   ├──► (Review Approved) ──► [ APPROVED ]
       │                                              │
       └──► (Cancel) ──► [ CANCELLED ]                └──► (Review Rejected) ──► [ REJECTED ]
```
- **Rule**: XP and volunteering hours are only added to user balances when the state transitions to `APPROVED`.

### 3.3 Compliance Issues Lifecycle
```
[ OPEN ] ──► (Assign & Investigate) ──► [ INVESTIGATING ] ──► (Submit Proof) ──► [ RESOLVED ]
   │                                           │
   ├── (Due Date Exceeded) ────────────────────┼──► [ OVERDUE ] ──► (Late Resolve) ──► [ RESOLVED ]
   ▼                                           ▼
(Ignore/Archive) ──────────────────────────────┴──► [ ARCHIVED ]
```
- **Rule**: Overdue checks run automatically via a nightly CRON job. Transition to `RESOLVED` requires text description inputs and auditor approval signatures.

### 3.4 Audit Records Lifecycle
```
[ PLANNED ] ──► (Launch) ──► [ IN_PROGRESS ] ──► (Submit Score & Report) ──► [ COMPLETED ] ──► [ ARCHIVED ]
```

### 3.5 XP Reward Redemptions Lifecycle
```
[ PENDING ] ──► (Admin Approves) ──► [ APPROVED ] ──► (Item Dispatched) ──► [ FULFILLED ]
    │
    └──► (Admin Rejects) ──► [ REJECTED ] (XP refunded to user balance)
```

---

## 4. Reports Specification

Administrators generate reports to audit metrics, submit regulatory ESG statements, or present reports to the Board.

### 4.1 Report Types & Scopes
1. **GHG Protocol Carbon Report (Environmental)**:
   - Scope 1, 2, and 3 emissions logs details.
   - Dynamic comparisons of actual carbon footprint output against target parameters.
   - Emission factor source citations.
2. **Social Impact Ledger (Social)**:
   - Aggregated volunteering hours, total charity funding records, and training completion scores.
   - Department engagement comparison indexes.
3. **Corporate Governance Audit Report (Governance)**:
   - Policy acknowledgment registry proving signing percentages.
   - compliance issue log highlighting mean-time-to-resolution (MTTR) metrics.
   - Past audit reports list.

### 4.2 Query Filters & Control Inputs
- **Tenant Scope**: Filter by `department_id` or organizational division.
- **Temporal Filter**: Start and end date range.
- **Status Filter**: Toggle historical drafts, approvals, or compliance alerts.

### 4.3 Export Engine Parameters
- **CSV/Excel Export**: Generates raw transactional columns, including calculations.
- **PDF Export**: Renders dynamic summaries, KPI metric cards, and charts formatted for print layouts.

---

## 5. Notification Flow Matrix

The EcoSphere notification engine delivers updates to keep teams aligned and gamification active.

### 5.1 Trigger Matrix

| Notification Event | Triggering Action | Recipient Role | Delivery Channel | Email Template |
| :--- | :--- | :--- | :--- | :--- |
| **Compliance Issue Raised** | Audit record flags issue or admin registers it. | Assigned Owner | In-App & Email | `compliance_alert_new` |
| **Issue Overdue Alert** | Current date exceeds due date on open issue. | Assigned Owner, Org Admin | In-App & Email | `compliance_sla_overdue` |
| **New Policy Published** | Policy status transitions to `ACTIVE`. | All Tenant Employees | In-App & Email | `policy_signature_required` |
| **Carbon Log Pending** | Manager logs carbon data. | Org Admin | In-App | None (In-App only) |
| **Evidence Validation Approved** | Admin signs off on CSR hours or Carbon Log. | Logging Employee | In-App | None (In-App only) |
| **Badge Unlocked** | Badge conditions validation returns TRUE. | Earning Employee | In-App & Email | `badge_achievement` |
| **Challenge Closing Soon** | Active challenge reaches 24 hours to end date. | Enrolled Employees | In-App | None (In-App only) |
| **Redemption Review** | Employee submits XP reward purchase. | Org Admin | In-App | None (In-App only) |

### 5.2 Opt-In/Opt-Out Configs
Users customize delivery channels in their profile settings. These settings map directly to columns in the `user_notification_settings` table:
- Email toggles: Compliance Alerts, Gamification Challenges, Approvals.
- In-App toggles: Compliance Alerts, Gamification Challenges, Approvals.
- Note: System-critical alerts (such as password resets or data breach notifications) bypass preferences and always send via email.
