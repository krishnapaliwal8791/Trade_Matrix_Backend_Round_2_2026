# Frontend Integration Guide

⚠️ Current Backend Status

As of this document version, only the following endpoints are implemented and registered:

- GET /health
- GET /auth/me
- GET /event
- POST /organizer/import-round1
- POST /organizer/start-event
- GET /organizer/news-bundles
- GET /users/active-news-bundle
- GET /users/news-bundles/:id
- POST /organizer/news-bundles/:id/reveal

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
    "success": true,
    "data": {
      "status": "string",
      "database": "string"
    }
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
    "success": true,
    "data": {
      "id": "string (uuid)",
      "clerkId": "string",
      "role": "ORGANIZER | TEAM_CAPTAIN | PARTICIPANT",
      "teamId": "string (uuid) | null",
      "status": "ACTIVE | INACTIVE"
    }
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
    "success": true,
    "data": {
      "importedCompanies": "number",
      "importedTeams": "number",
      "importedPortfolios": "number",
      "importedHoldings": "number",
      "eventStatus": "DATA_IMPORTED"
    }
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

---

### 4. Get Current Event State

- **HTTP Method:** `GET`
- **Path:** `/event`
- **Auth Requirement:** Required
- **Required Role:** `ORGANIZER`, `TEAM_CAPTAIN`, or `PARTICIPANT`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": {
      "status": "LIVE",
      "activeNewsBundleId": null,
      "leaderboardVisible": false
    }
  }
  ```
- **Business Rules:**
  - Returns the global Event singleton state.
  - Used by the frontend to determine if the event has started, ended, or if a news bundle is active.

---

### 5. Start Event

- **HTTP Method:** `POST`
- **Path:** `/organizer/start-event`
- **Auth Requirement:** Required
- **Required Role:** `ORGANIZER`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": {}
  }
  ```
- **Business Rules:**
  - Allowed only when Event status is `DATA_IMPORTED`.
  - Sets Event status to `LIVE`.
  - Sets `activeNewsBundleId` to `null`.
  - Sets `leaderboardVisible` to `false`.
  - Cannot be executed twice.

---

### 6. Get Organizer News Bundles

- **HTTP Method:** `GET`
- **Path:** `/organizer/news-bundles`
- **Auth Requirement:** Required
- **Required Role:** `ORGANIZER`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "title": "string",
        "status": "PENDING | ACTIVE | COMPLETED",
        "releasedAt": "string (ISO Date) | null",
        "newsCount": "number",
        "bundlePriceCount": "number"
      }
    ]
  }
  ```
- **Business Rules:**
  - Returns a list of all News Bundles configured in the system.
  - Generates read-time derivations for `newsCount` and `bundlePriceCount`.
  - Intentionally does NOT return nested `News` or `BundlePrice` entities.
  - No ordering guarantee is provided by the backend. The frontend must not rely on bundle position or implicit sorting.

---

### 7. Get Active News Bundle

- **HTTP Method:** `GET`
- **Path:** `/users/active-news-bundle`
- **Auth Requirement:** Required
- **Required Role:** `PARTICIPANT`, `TEAM_CAPTAIN`
- **Request DTO:** None
- **Response DTO (Active):**
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "title": "string",
      "releasedAt": "string (ISO Date)"
    }
  }
  ```
- **Response DTO (Inactive):**
  ```json
  {
    "success": true,
    "data": null
  }
  ```
- **Business Rules:**
  - Returns the bundle referenced by the authoritative `Event.activeNewsBundleId` property.
  - Returns a `200 OK` with `data: null` if no bundle is active. The frontend must expect this and render an appropriate empty/waiting state, not treat it as a `404` error.
  - Explicitly does NOT return the nested `News` array. To view news content, the frontend must issue a subsequent `GET` to the detailed news bundle endpoint using the retrieved `id`.

**Frontend Flow:**

GET /users/active-news-bundle
    ↓
If data is null → show waiting state
    ↓
If data exists
    ↓
GET /users/news-bundles/:id
    ↓
Render news articles

---

### 8. Get News Bundle Details

- **HTTP Method:** `GET`
- **Path:** `/users/news-bundles/:id`
- **Auth Requirement:** Required
- **Required Role:** `PARTICIPANT`, `TEAM_CAPTAIN`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "title": "string",
      "releasedAt": "string (ISO Date)",
      "news": [
        {
          "id": "string",
          "title": "string",
          "content": "string"
        }
      ]
    }
  }
  ```
- **Business Rules:**
  - ACTIVE bundles are accessible.
  - COMPLETED bundles are accessible.
  - PENDING bundles must return 404 NOT_FOUND_ERROR.
  - Non-existent bundles must return 404 NOT_FOUND_ERROR.
  - BundlePrices are never returned.
  - News content is returned.
  - Organizers must not use this endpoint.
  - The frontend should only call this endpoint after obtaining a bundle id from GET /users/active-news-bundle.

---

### 9. Reveal News Bundle

- **HTTP Method:** `POST`
- **Path:** `/organizer/news-bundles/:id/reveal`
- **Auth Requirement:** Required
- **Required Role:** `ORGANIZER`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": {}
  }
  ```
- **Business Rules:**
  - Event must be `LIVE`.
  - No active bundle may already exist (`Event.activeNewsBundleId` must be `null`).
  - Bundle must exist and its status must be `PENDING`.
  - Bundle must contain exactly one `BundlePrice` for every `Company` in the system.
  - Every `BundlePrice.targetPrice` must be `> 0`.
  - Updates the bundle status to `ACTIVE` and sets `releasedAt` to the current timestamp.
  - Updates `Event.activeNewsBundleId` to the revealed bundle's ID and sets `Event.leaderboardVisible` to `false`.
- **Frontend Usage Notes:**
  - Successful execution of this endpoint enables the active trading window for participants.
