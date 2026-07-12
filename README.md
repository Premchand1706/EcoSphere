# EcoSphere: Enterprise-Grade ESG Management Platform

Welcome to **EcoSphere**, a production-grade ESG (Environmental, Social, and Governance) Management Platform developed for the **Odoo Hackathon 2026**. 

EcoSphere is designed to help organizations ingest operational data, monitor sustainability performance, manage corporate social responsibilities (CSR), enforce regulatory policy compliance, and engage employees via gamified milestones.

---

## 🚀 Architectural Overview

EcoSphere is architected using a monorepo-style layout with a decoupled TypeScript Express Backend at the root and a high-fidelity React Single Page Application (SPA) inside the `/client` directory.

### Technology Stack
* **Frontend**: React (Vite), Tailwind CSS v4, React Router, React Query (TanStack Query), Axios, Recharts, and Lucide Icons.
* **Backend**: Node.js, Express, TypeScript, JWT-based Authentication, and RBAC (Role-Based Access Control) Middlewares.
* **Database & ORM**: PostgreSQL (Production) / SQLite (Local Fallback) mapped dynamically via **Prisma ORM**.

---

## 📦 Core Modules & Features

### 1. Environmental Accounting Module
* **Scope 1, 2, and 3 Emissions Ingestion**: Ingest carbon output data like fleet diesel (Scope 1), purchased grid electricity (Scope 2), and travel flights (Scope 3).
* **Automated Calculations**: Calculates metric tons of CO2 equivalent ($tCO_2e$) on-the-fly using EPA and DEFRA carbon multipliers.
* **Audit-Ready Validation**: Dual-approval workflow ensuring data enters a `PENDING_APPROVAL` state for review by administrators before modifying aggregate ESG scores.

### 2. Social Impact Portal
* **Volunteering & Fundraising Campaigns**: Track organizational contributions, event times, and total fundraising goals.
* **Verification Loop**: Employees claim hours and upload evidence documents (URLs) for manager approval.

### 3. Governance Desk & Audit Trails
* **Policy Sign-off Registry**: Active compliance library with version controls requiring digital signatures/acknowledgements.
* **Issue SLA Sweeper**: Tracks compliance infractions, audit findings, severity metrics, and automates overdue escalations.
* **Immutable System Audit Log**: Tracks user actions, modified entity states (pre/post transitions), IP addresses, and user-agents.

### 4. Gamification & Engagement Engine
* **XP & Levels Progression**: Event-driven rewards awarding points for carbon logs approvals, volunteer hours, and policy signings. Leveling maps to a logarithmic curve ($L = \lfloor 1 + \sqrt{\text{XP} / 100} \rfloor$).
* **Dynamically Unlocked Badges**: Badge checks triggered by specific system actions (e.g. *Carbon Crusher* for 10 approved logs, *Compliance Guardian* for complete policy reviews).
* **Eco-Challenges**: Checklists and targets for organization-wide initiatives.
* **Rewards Shop**: Catalog where users redeem their XP balance for corporate rewards.

---

## 🛠️ Getting Started (Local Development)

### Prerequisites
* **Node.js** (v20+ recommended)
* **npm** (v10+)

*Note: For local SQLite database setup, no active Postgres or Docker service is required. The server creates and configures a local SQLite file (`dev.db`) automatically.*

---

### Step 1: Environment Variables Configuration

Create a `.env` file in the root directory:
```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="super-secret-key-ecosphere-2026-hackathon-odoo"
```

---

### Step 2: Backend Setup & Seed
From the root directory (`/`):
1. **Install root dependencies**:
   ```bash
   npm install
   ```
2. **Generate Prisma Client and push SQLite schema**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
3. **Execute database seed script** (sets up default accounts & factors):
   ```bash
   npm run prisma:seed
   ```
4. **Build and Run Backend**:
   ```bash
   npm run build
   node dist/server.js
   ```
   *The backend REST API starts on `http://localhost:5000`.*

---

### Step 3: Frontend Client Setup
From the client directory (`/client`):
1. **Install frontend dependencies**:
   ```bash
   npm install
   ```
2. **Build and Run Vite Dev Server**:
   ```bash
   npm run dev
   ```
   *The frontend SPA launches on `http://localhost:5173`.*

---

## 🔑 Seeder Logins (Testing Credentials)

The database seed script sets up the following tenant sandbox users under the mock organization **EcoCorp Enterprises** (`ecocorp.com`). Passwords for all accounts are `Password123`.

| User Role | Email | Privileges |
| :--- | :--- | :--- |
| **Organization Admin** | `admin@ecocorp.com` | Full platform control, carbon approvals, CSR event creations. |
| **Department Manager** | `manager.it@ecocorp.com` | Log carbon logs, volunteer claims reviews. |
| **Standard Employee** | `dev.one@ecocorp.com` | Ingest personal carbon output, claim volunteer hours, browse badges & redeem rewards. |
| **Third-Party Auditor** | `auditor@ecosphere.com` | Access system audit logs, declare compliance issues, review signature compliance rates. |

---

## 📊 Codebase Structure

```
EcoSphere/
├── client/                     # React + Vite SPA Frontend
│   ├── src/
│   │   ├── layouts/            # Layout shells (Sidebar navigation, user profile context)
│   │   ├── pages/              # Page modules (Dashboard, Environmental, Social, Governance, Gamification)
│   │   ├── services/           # Axios API wrappers
│   │   └── index.css           # Global custom styling sheet (Tailwind v4)
│   ├── package.json
│   └── tsconfig.json
├── prisma/
│   ├── schema.prisma           # SQLite Database Schema
│   ├── schema.postgresql.prisma # PostgreSQL Database Schema Archive (Production)
│   └── seed.ts                 # Sandbox Seeder Setup Script
├── src/                        # Node.js + Express Backend Source
│   ├── config/                 # Configurations (Prisma Client config)
│   ├── middlewares/            # JWT validation, Role check, RFC 7807 global errors
│   ├── routes/                 # REST endpoints (auth, carbon, csr, governance, gamification)
│   ├── services/               # Platform calculations, transaction handling, event triggers
│   ├── types/                  # TypeScript interface helpers and local enums
│   └── server.ts               # Server startup entrypoint
├── package.json
└── tsconfig.json
```

---

## 🔒 Production Readiness (Switching to PostgreSQL)

When ready to host on cloud infrastructure (e.g. AWS, Render, Heroku) with a PostgreSQL database:
1. Replace `/prisma/schema.prisma` with the contents of `/prisma/schema.postgresql.prisma`.
2. Configure `.env` with your Postgres connection string:
   ```env
   DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"
   ```
3. Run `npx prisma db push` (or prisma migrations) to rebuild database tables.
4. The system is designed to seamlessly scale with PostgreSQL indexes and constraints.
