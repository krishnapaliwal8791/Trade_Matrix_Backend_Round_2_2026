# Frontend Integration Guide

⚠️ Current Backend Status

As of this document version, only the following endpoints are implemented and registered:

- GET /health
- GET /auth/me
- POST /organizer/import-round1

Additional endpoints will be documented as they are implemented.

This document contains the fully implemented and registered REST API endpoints for frontend integration.



## General Structure

All API responses follow a standard envelope:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "reason": "Optional technical reason",
  "suggestedFix": "Optional fix suggestion"
}
```

---

## Endpoints

### 1. System Health Check

- **HTTP Method:** `GET`
- **Path:** `/health`
- **Auth Requirement:** None
- **Required Role:** None
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "status": "string",
    "database": "string"
  }
  ```
- **Business Rules:**
  - Verifies basic API availability and actual database connectivity by running a test query. Returns a 503 error if the database connection fails.

---

### 2. Get Current User

- **HTTP Method:** `GET`
- **Path:** `/auth/me`
- **Auth Requirement:** Required (Valid Clerk JWT)
- **Required Role:** None
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "id": "string (uuid)",
    "clerkId": "string",
    "role": "ORGANIZER | TEAM_CAPTAIN | PARTICIPANT",
    "teamId": "string (uuid) | null",
    "status": "ACTIVE | INACTIVE"
  }
  ```
- **Business Rules:**
  - Requires the user to be fully provisioned in the backend database with a valid Clerk session.

---

### 3. Import Round 1 Data

- **HTTP Method:** `POST`
- **Path:** `/organizer/import-round1`
- **Auth Requirement:** Required
- **Required Role:** `ORGANIZER`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "importedCompanies": "number",
    "importedTeams": "number",
    "importedPortfolios": "number",
    "importedHoldings": "number",
    "eventStatus": "DATA_IMPORTED"
  }
  ```
- **Business Rules:**
  - The Event status must be `WAITING`.
  - Connects to an external Round 1 API to fetch export data. The Round 1 Event status must be `IPO_COMPLETED`.
  - Ensure database tables (Company, Market, Portfolio, Holding) are completely empty before starting the import.
  - Verifies exact team parity between Round 1 data and provisioned Round 2 teams.
  - Each provisioned team must have exactly 1 `TEAM_CAPTAIN` and 3 `PARTICIPANT`s.
  - Automatically provisions companies, initial market prices, and team portfolios based on the data.
  - Sets the Event status to `DATA_IMPORTED` upon successful completion.
