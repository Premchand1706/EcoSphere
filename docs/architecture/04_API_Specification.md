# EcoSphere ESG Management Platform: API Specification Document

This document catalogs the REST API specifications for the **EcoSphere** platform, defining endpoints, security controls, payloads, and error handlers.

---

## 1. Global API Configuration

- **Base URL**: `/api/v1`
- **Content Type**: `application/json`
- **Authentication**: Bearer Token in request header: `Authorization: Bearer <JWT>`
- **Rate Limiting**:
  - Auth routes: Max 10 requests per 15 minutes per IP.
  - Operational routes: Max 300 requests per 15 minutes per IP.

---

## 2. API Endpoint Manifest

### 2.1 Authentication & Profile Module

#### `POST /auth/login`
- **Description**: Authenticate a user and return a JWT.
- **Access**: Public
- **Request Payload**:
  ```json
  {
    "email": "user@ecocorp.com",
    "password": "SecurePassword123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "e10c73a8-d99f-4318-b2a6-b5257e2ff403",
      "firstName": "Alice",
      "lastName": "Smith",
      "email": "user@ecocorp.com",
      "role": "EMPLOYEE",
      "organizationId": "f40f09a1-0738-4b77-ad54-5e1654e8cb2f"
    }
  }
  ```

#### `GET /auth/me`
- **Description**: Get active login profile info, levels, and XP.
- **Access**: Authenticated (Any role)
- **Response (200 OK)**:
  ```json
  {
    "id": "e10c73a8-d99f-4318-b2a6-b5257e2ff403",
    "email": "user@ecocorp.com",
    "role": "EMPLOYEE",
    "xp": 1250,
    "level": 6,
    "organizationId": "f40f09a1-0738-4b77-ad54-5e1654e8cb2f"
  }
  ```

---

### 2.2 Environmental Module

#### `POST /carbon/logs`
- **Description**: Log carbon activity data.
- **Access**: `ORG_ADMIN`, `DEPT_MANAGER`
- **Request Payload**:
  ```json
  {
    "departmentId": "a10e8d0e-26f6-4196-857e-9eb205777101",
    "activityType": "grid_electricity",
    "category": "SCOPE_2",
    "quantity": 12500.50,
    "unit": "kWh",
    "emissionFactorId": "c000f09a-0001-44ab-b3c4-e816a75f1101",
    "logDate": "2026-07-10",
    "evidenceUrl": "https://storage.ecosphere.local/receipts/utility-2026-07.pdf",
    "notes": "Q2 IT floor consumption"
  }
  ```
- **Response (210 Created)**:
  ```json
  {
    "id": "c16d5570-5b12-42da-92ee-ea5e1564f128",
    "calculatedCo2e": 4.8126, // calculated: 12500.5 * 0.000385 tCO2e/kWh
    "status": "PENDING_APPROVAL"
  }
  ```

#### `POST /carbon/logs/:id/approve`
- **Description**: Approve or reject a logged carbon activity.
- **Access**: `ORG_ADMIN` (or `DEPT_MANAGER` if the log belongs to their department)
- **Request Payload**:
  ```json
  {
    "action": "APPROVED", // or "REJECTED"
    "comments": "Verified against electric bill."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "c16d5570-5b12-42da-92ee-ea5e1564f128",
    "status": "APPROVED",
    "approvedBy": "e10c73a8-d99f-4318-b2a6-b5257e2ff401"
  }
  ```

#### `GET /carbon/analytics`
- **Description**: Fetch carbon reduction progress against targets.
- **Access**: Authenticated (Any role)
- **Query Parameters**:
  - `departmentId` (optional)
  - `startDate` (optional)
  - `endDate` (optional)
- **Response (200 OK)**:
  ```json
  {
    "scopeMetrics": {
      "SCOPE_1": 45.2,
      "SCOPE_2": 112.8,
      "SCOPE_3": 18.5,
      "total": 176.5
    },
    "targetsProgress": [
      {
        "scope": "TOTAL",
        "targetReductionPct": 15.00,
        "baselineValue": 200.0000,
        "targetValue": 170.0000,
        "actualValue": 176.5000,
        "percentComplete": 78.33,
        "status": "ACTIVE"
      }
    ]
  }
  ```

---

### 2.3 Social Module

#### `POST /csr/activities`
- **Description**: Create a CSR volunteer or donation activity event.
- **Access**: `ORG_ADMIN`
- **Request Payload**:
  ```json
  {
    "title": "Beach Cleanup Drive",
    "description": "Annual marine waste collection.",
    "type": "ENVIRONMENTAL_CLEANUP",
    "startDate": "2026-07-20T09:00:00Z",
    "endDate": "2026-07-20T14:00:00Z",
    "requiredHours": 5.00,
    "evidenceRequired": true
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "s9876543-9ebf-4f21-ba2c-29a888c7f999",
    "status": "DRAFT"
  }
  ```

#### `POST /csr/activities/:id/register`
- **Description**: Register the authenticated employee to participate in a CSR activity.
- **Access**: `EMPLOYEE`
- **Response (200 OK)**:
  ```json
  {
    "registrationId": "r1029384-9ebf-4f21-ba2c-29a888c7fa01",
    "status": "REGISTERED"
  }
  ```

#### `POST /csr/registrations/:id/log-hours`
- **Description**: Submit logged volunteering hours and evidence for review.
- **Access**: `EMPLOYEE` (must own registration)
- **Request Payload**:
  ```json
  {
    "loggedHours": 4.5,
    "evidenceUrl": "https://storage.ecosphere.local/evidence/volunteer_sign_sheet.png"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "registrationId": "r1029384-9ebf-4f21-ba2c-29a888c7fa01",
    "approvalStatus": "PENDING"
  }
  ```

#### `POST /csr/registrations/:id/approve`
- **Description**: Approve user participation and grant XP/hours.
- **Access**: `ORG_ADMIN`, `DEPT_MANAGER`
- **Request Payload**:
  ```json
  {
    "approvalStatus": "APPROVED", // or "REJECTED"
    "comments": "Confirmed presence on registration sheet."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "registrationId": "r1029384-9ebf-4f21-ba2c-29a888c7fa01",
    "approvalStatus": "APPROVED",
    "xpAwarded": 450 // 4.5 hours * 100 XP/hr
  }
  ```

---

### 2.4 Governance Module

#### `POST /governance/policies`
- **Description**: Publish a compliance document.
- **Access**: `ORG_ADMIN`
- **Request Payload**:
  ```json
  {
    "title": "Anti-Bribery and Corruption Code",
    "content": "Standard compliance operating framework...",
    "category": "GOVERNANCE",
    "version": "1.0"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "p0000123-abcd-ef01-2345-6789abcdef01",
    "status": "DRAFT"
  }
  ```

#### `POST /governance/policies/:id/acknowledge`
- **Description**: Acknowledge that the policy has been read and accepted.
- **Access**: Authenticated (Any role)
- **Response (200 OK)**:
  ```json
  {
    "policyId": "p0000123-abcd-ef01-2345-6789abcdef01",
    "acknowledgedAt": "2026-07-12T08:15:30Z",
    "xpAwarded": 150
  }
  ```

#### `POST /governance/compliance-issues`
- **Description**: Log a compliance issue raised by audit reviews.
- **Access**: `ORG_ADMIN`, `AUDITOR`
- **Request Payload**:
  ```json
  {
    "auditId": "a9876543-abcd-ef01-2345-6789abcdef02",
    "title": "Scope 2 Logging Gap",
    "description": "Grid electricity invoices missing for logistics warehouse during Q1.",
    "severity": "HIGH",
    "ownerId": "e10c73a8-d99f-4318-b2a6-b5257e2ff402", // department manager assigned
    "dueDate": "2026-08-15"
  }
  ```
- **Response (210 Created)**:
  ```json
  {
    "id": "i0000111-abcd-ef01-2345-6789abcdef03",
    "status": "OPEN"
  }
  ```

#### `POST /governance/compliance-issues/:id/resolve`
- **Description**: Resolve a compliance issue with evidence.
- **Access**: `ORG_ADMIN` or Assigned Issue Owner (`DEPT_MANAGER`)
- **Request Payload**:
  ```json
  {
    "resolutionDetails": "Uploaded back-invoices for January to March 2026."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "i0000111-abcd-ef01-2345-6789abcdef03",
    "status": "RESOLVED",
    "resolvedAt": "2026-07-12T08:20:00Z"
  }
  ```

#### `GET /governance/audit-logs`
- **Description**: Retrieve administrative data audit trail.
- **Access**: `ORG_ADMIN`, `AUDITOR`
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "f8888888-abcd-1234-5678-abcdefabcdef",
      "action": "UPDATE_CARBON_LOG",
      "entityType": "carbon_logs",
      "entityId": "c16d5570-5b12-42da-92ee-ea5e1564f128",
      "userId": "e10c73a8-d99f-4318-b2a6-b5257e2ff401",
      "preState": { "quantity": 10000 },
      "postState": { "quantity": 12500.5 },
      "createdAt": "2026-07-12T08:14:22Z"
    }
  ]
  ```

---

### 2.5 Gamification Module

#### `GET /gamification/leaderboard`
- **Description**: Retrieve leaderboard rankings sorted by XP.
- **Access**: Authenticated (Any role)
- **Response (200 OK)**:
  ```json
  {
    "organizationLeaderboard": [
      { "rank": 1, "userId": "e10c73a8-d99f-4318-b2a6-b5257e2ff403", "name": "Alice Smith", "level": 6, "xp": 1250 },
      { "rank": 2, "userId": "e10c73a8-d99f-4318-b2a6-b5257e2ff402", "name": "David Lightman", "level": 3, "xp": 500 }
    ],
    "departmentRankings": [
      { "rank": 1, "departmentId": "a10e8d0e-26f6-4196-857e-9eb205777101", "name": "Engineering & IT", "averageXpPerMember": 875.00 },
      { "rank": 2, "departmentId": "a10e8d0e-26f6-4196-857e-9eb205777102", "name": "Logistics & Supply Chain", "averageXpPerMember": 0.00 }
    ]
  }
  ```

#### `POST /gamification/rewards/redeem`
- **Description**: Redeem items from XP rewards shop.
- **Access**: `EMPLOYEE`
- **Request Payload**:
  ```json
  {
    "rewardId": "r9999999-abcd-1234-5678-abcdefabcdef"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "redemptionId": "d7777777-abcd-1234-5678-abcdefabcdef",
    "status": "PENDING",
    "remainingXp": 250 // 1250 - 1000 cost
  }
  ```

---

## 3. API Authorization Matrix (RBAC)

Below is the definitive reference table showing access levels across resources:

| Endpoint | SUPER_ADMIN | ORG_ADMIN | DEPT_MANAGER | AUDITOR | EMPLOYEE |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `POST /auth/login` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `GET /auth/me` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `POST /carbon/logs` | ✘ | ✔ | ✔ | ✘ | ✘ |
| `POST /carbon/logs/:id/approve` | ✘ | ✔ | ✔ (Dept Only) | ✘ | ✘ |
| `POST /csr/activities` | ✘ | ✔ | ✘ | ✘ | ✘ |
| `POST /csr/activities/:id/register`| ✘ | ✘ | ✘ | ✘ | ✔ |
| `POST /csr/registrations/:id/approve`| ✘ | ✔ | ✔ | ✘ | ✘ |
| `POST /governance/policies` | ✘ | ✔ | ✘ | ✘ | ✘ |
| `POST /governance/policies/:id/ack` | ✘ | ✔ | ✔ | ✔ | ✔ |
| `POST /governance/compliance-issues`| ✘ | ✔ | ✘ | ✔ | ✘ |
| `GET /governance/audit-logs` | ✘ | ✔ | ✘ | ✔ | ✘ |
| `GET /gamification/leaderboard` | ✘ | ✔ | ✔ | ✔ | ✔ |
| `POST /gamification/rewards/redeem`| ✘ | ✘ | ✘ | ✘ | ✔ |

---

## 4. Error Handling Protocol (RFC 7807 Compliance)

In the event of an exception (validation error, resource missing, forbidden action), EcoSphere API returns error responses conforming to the **RFC 7807 (Problem Details for HTTP APIs)** specification.

### 4.1 Error Payload Structure
```json
{
  "type": "https://ecosphere.com/errors/invalid-parameter",
  "title": "Request Parameter Invalid",
  "status": 400,
  "detail": "Detailed message outlining what exactly failed validation rules.",
  "instance": "/api/v1/carbon/logs",
  "code": "VALIDATION_FAILED",
  "errors": [
    {
      "field": "quantity",
      "message": "The quantity parameter must be greater than zero."
    }
  ]
}
```

### 4.2 Standard API Error Reference Table

| Code | HTTP Status | Description | Action Trigger |
| :--- | :--- | :--- | :--- |
| `UNAUTHORIZED` | `401 Unauthorized` | JWT token expired, malformed, or missing. | Present login prompt. |
| `FORBIDDEN` | `403 Forbidden` | RBAC validation failed for the logged-in role. | Show access denied message. |
| `NOT_FOUND` | `404 Not Found` | Target record UUID does not exist. | Route to list or dashboard view. |
| `VALIDATION_FAILED` | `400 Bad Request` | Post parameters did not match Zod input validation schemas. | Highlight form inputs. |
| `RESOURCE_EXHAUSTED` | `429 Too Many Requests`| Rate limit exceeded. | Start cooldown counter. |
| `OUT_OF_STOCK` | `400 Bad Request` | Target XP reward stock level is 0. | Disable purchase button. |
| `INSUFFICIENT_XP` | `400 Bad Request` | User XP balance is lower than reward item cost. | Block purchase request. |
| `DATABASE_ERROR` | `500 Internal Error` | Database constraints prevent transaction execution. | Show contact support message. |
