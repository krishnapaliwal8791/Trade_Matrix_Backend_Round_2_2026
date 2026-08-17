# Frontend Integration Guide

⚠️ Current Backend Status

As of this document version, only the following endpoints are implemented and registered:

- GET /health
- GET /auth/me
- GET /event
- GET /users/dashboard
- POST /organizer/import-round1
- POST /organizer/start-event
- GET /organizer/news-bundles
- GET /users/active-news-bundle
- GET /users/news-bundles/:id
- POST /organizer/news-bundles/:id/reveal
- GET /organizer/markets
- POST /organizer/apply-prices

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

---

### 10. Get Markets

- **HTTP Method:** `GET`
- **Path:** `/organizer/markets`
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
        "companyId": "string",
        "currentPrice": "number",
        "Company": {
          "name": "string",
          "sector": "string",
          "logo": "string | null"
        }
      }
    ]
  }
  ```
- **Business Rules:**
  - Returns all Market records.
  - Returns `id`, `companyId`, `currentPrice`, and nested `Company` metadata to avoid N+1 frontend requests.
  - Organizer-only endpoint.

---

### 11. Apply Prices

- **HTTP Method:** `POST`
- **Path:** `/organizer/apply-prices`
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
  - `Event.activeNewsBundleId` must not be `null`.
  - Active bundle must exist and be `ACTIVE`.
  - There must be zero `SellRequests` with status `ORGANIZER_PENDING`.
  - Active bundle must contain exactly one `BundlePrice` for every `Company`.
  - Every `BundlePrice.targetPrice` must be `> 0`.
  - MarketEngine updates:
    - `previousPrice = currentPrice`
    - `currentPrice = targetPrice`
    - `highPrice = max(highPrice, targetPrice)`
    - `lowPrice = min(lowPrice, targetPrice)`
  - Deletes all `SellRequests`.
  - Releases all reservations.
  - Updates bundle status to `COMPLETED`.
  - Sets `Event.activeNewsBundleId` to `null`.
  - Sets `Event.leaderboardVisible` to `true`.
  - Entire operation executes atomically.
  - **Cleanup Behavior:**
    - ALL SellRequests are deleted.
    - BUYER_PENDING requests are discarded.
    - REJECTED requests are deleted.
    - COMPLETED requests are deleted.
    - reservedCash is reset to 0.
    - reservedQuantity is reset to 0.

---

## Sell Request State Machine

The Sell Request workflow enforces a strict linear state machine:

1. **NULL → BUYER_PENDING**: Created by the seller. The seller's shares are immediately reserved (`Holding.reservedQuantity` increments).
2. **BUYER_PENDING → ORGANIZER_PENDING**: Accepted by the buyer. The buyer's cash is immediately reserved (`Portfolio.reservedCash` increments).
3. **BUYER_PENDING → REJECTED**: Rejected by the buyer. The seller's shares are unreserved.
4. **ORGANIZER_PENDING → COMPLETED**: Approved by the Organizer. The seller's reserved shares are deducted, buyer receives the shares. The buyer's reserved cash is deducted, seller receives the cash. A permanent `Trade` record is created.
5. **ORGANIZER_PENDING → REJECTED**: Rejected by the Organizer. The seller's shares and buyer's cash are unreserved.

*Note: A seller cannot unilaterally cancel or reject their own request once created.*

---

## Sell Request Endpoints

### 12. Create Sell Request

- **HTTP Method:** `POST`
- **Path:** `/team-captain/sell-requests`
- **Auth Requirement:** Required
- **Required Role:** `TEAM_CAPTAIN`
- **Request DTO:**
  ```json
  {
    "buyerTeamId": "string (uuid)",
    "companyId": "string (uuid)",
    "quantity": "number (positive int)",
    "pricePerShare": "number"
  }
  ```
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "sellerTeamId": "string",
      "buyerTeamId": "string",
      "companyId": "string",
      "quantity": "number",
      "pricePerShare": "number",
      "reservedShares": "number",
      "reservedCash": "number",
      "status": "BUYER_PENDING",
      "rejectedBy": "string | null",
      "createdAt": "string",
      "updatedAt": "string"
    }
  }
  ```
- **Business Rules:**
  - Trading window must be active (`Event.status == LIVE` and `activeNewsBundleId != null`).
  - Cannot trade with own team.
  - Seller must own sufficient unreserved shares.
  - `pricePerShare` must be between 75% and 100% of the current market price.
  - Reserves the seller's shares upon successful creation.

---

### 13. List Outgoing Sell Requests (Captain)

- **HTTP Method:** `GET`
- **Path:** `/team-captain/sell-requests`
- **Auth Requirement:** Required
- **Required Role:** `TEAM_CAPTAIN`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "sellerTeamId": "string",
        "buyerTeamId": "string",
        "companyId": "string",
        "quantity": "number",
        "pricePerShare": "number",
        "reservedShares": "number",
        "reservedCash": "number",
        "status": "string",
        "rejectedBy": "string | null",
        "createdAt": "string",
        "updatedAt": "string",
        "Company": { "name": "string" },
        "BuyerTeam": { "name": "string" }
      }
    ]
  }
  ```
- **Business Rules:**
  - Returns all requests where the caller's team is the seller, sorted by newest first.

---

### 14. List Incoming Sell Requests (Captain)

- **HTTP Method:** `GET`
- **Path:** `/team-captain/sell-requests/incoming`
- **Auth Requirement:** Required
- **Required Role:** `TEAM_CAPTAIN`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "sellerTeamId": "string",
        "buyerTeamId": "string",
        "companyId": "string",
        "quantity": "number",
        "pricePerShare": "number",
        "reservedShares": "number",
        "reservedCash": "number",
        "status": "string",
        "rejectedBy": "string | null",
        "createdAt": "string",
        "updatedAt": "string",
        "Company": { "name": "string" },
        "SellerTeam": { "name": "string" }
      }
    ]
  }
  ```
- **Business Rules:**
  - Returns all requests where the caller's team is the buyer, sorted by newest first.

---

### 15. Accept Sell Request

- **HTTP Method:** `POST`
- **Path:** `/team-captain/sell-requests/:id/accept`
- **Auth Requirement:** Required
- **Required Role:** `TEAM_CAPTAIN`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": { "success": true }
  }
  ```
- **Business Rules:**
  - Trading window must be active.
  - Caller must be the `buyerTeamId`.
  - Request status must be `BUYER_PENDING`.
  - Buyer must have sufficient unreserved cash.
  - Updates status to `ORGANIZER_PENDING` and reserves the buyer's cash.

---

### 16. Reject Sell Request (Buyer)

- **HTTP Method:** `POST`
- **Path:** `/team-captain/sell-requests/:id/reject`
- **Auth Requirement:** Required
- **Required Role:** `TEAM_CAPTAIN`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": { "success": true }
  }
  ```
- **Business Rules:**
  - Trading window must be active.
  - Caller must be the `buyerTeamId`.
  - Request status must be `BUYER_PENDING`.
  - Updates status to `REJECTED` and releases the seller's reserved shares.
  - Sets `rejectedBy = BUYER`.

---

### 17. List Team Sell Requests (Participant)

- **HTTP Method:** `GET`
- **Path:** `/participant/sell-requests`
- **Auth Requirement:** Required
- **Required Role:** `PARTICIPANT`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "sellerTeamId": "string",
        "buyerTeamId": "string",
        "companyId": "string",
        "quantity": "number",
        "pricePerShare": "number",
        "reservedShares": "number",
        "reservedCash": "number",
        "status": "string",
        "rejectedBy": "string | null",
        "createdAt": "string",
        "updatedAt": "string",
        "Company": { "name": "string" },
        "SellerTeam": { "name": "string" },
        "BuyerTeam": { "name": "string" }
      }
    ]
  }
  ```
- **Business Rules:**
  - Returns all requests where the caller's team is either the buyer or the seller.

---

### 18. Get Specific Sell Request (Users)

- **HTTP Method:** `GET`
- **Path:** `/users/sell-requests/:id`
- **Auth Requirement:** Required
- **Required Role:** `PARTICIPANT`, `TEAM_CAPTAIN`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "sellerTeamId": "string",
      "buyerTeamId": "string",
      "companyId": "string",
      "quantity": "number",
      "pricePerShare": "number",
      "reservedShares": "number",
      "reservedCash": "number",
      "status": "string",
      "rejectedBy": "string | null",
      "createdAt": "string",
      "updatedAt": "string"
    }
  }
  ```
- **Business Rules:**
  - Caller's team must be either the `buyerTeamId` or the `sellerTeamId` (403 Forbidden otherwise).
  - Organizers cannot use this endpoint.

---

### 19. List All Sell Requests (Organizer)

- **HTTP Method:** `GET`
- **Path:** `/organizer/sell-requests`
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
        "sellerTeamId": "string",
        "buyerTeamId": "string",
        "companyId": "string",
        "quantity": "number",
        "pricePerShare": "number",
        "reservedShares": "number",
        "reservedCash": "number",
        "status": "string",
        "rejectedBy": "string | null",
        "createdAt": "string",
        "updatedAt": "string",
        "Company": { "name": "string" },
        "SellerTeam": { "name": "string" },
        "BuyerTeam": { "name": "string" }
      }
    ]
  }
  ```
- **Business Rules:**
  - Returns all active sell requests in the system.

---

### 20. Get Specific Sell Request (Organizer)

- **HTTP Method:** `GET`
- **Path:** `/organizer/sell-requests/:id`
- **Auth Requirement:** Required
- **Required Role:** `ORGANIZER`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "sellerTeamId": "string",
      "buyerTeamId": "string",
      "companyId": "string",
      "quantity": "number",
      "pricePerShare": "number",
      "reservedShares": "number",
      "reservedCash": "number",
      "status": "string",
      "rejectedBy": "string | null",
      "createdAt": "string",
      "updatedAt": "string"
    }
  }
  ```
- **Business Rules:**
  - Returns the requested Sell Request data.

---

### 21. Approve Sell Request (Organizer)

- **HTTP Method:** `POST`
- **Path:** `/organizer/sell-requests/:id/approve`
- **Auth Requirement:** Required
- **Required Role:** `ORGANIZER`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": { "success": true }
  }
  ```
- **Business Rules:**
  - Trading window must be active.
  - Request status must be `ORGANIZER_PENDING`.
  - Updates status to `COMPLETED`.
  - Executes the trade: deducts reserved shares from seller, deducts reserved cash from buyer, increments cash for seller, increments shares for buyer.
  - Creates a permanent `Trade` record for historical ledger purposes.

---

### 22. Reject Sell Request (Organizer)

- **HTTP Method:** `POST`
- **Path:** `/organizer/sell-requests/:id/reject`
- **Auth Requirement:** Required
- **Required Role:** `ORGANIZER`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": { "success": true }
  }
  ```
- **Business Rules:**
  - Trading window must be active.
  - Request status must be `ORGANIZER_PENDING`.
  - Updates status to `REJECTED` and records `rejectedBy = ORGANIZER`.
  - Releases both the seller's reserved shares and the buyer's reserved cash.

---

### 23. Get User Dashboard

- **HTTP Method:** `GET`
- **Path:** `/users/dashboard`
- **Auth Requirement:** Required
- **Required Role:** `PARTICIPANT`, `TEAM_CAPTAIN`
- **Request DTO:** None
- **Response DTO:**
  ```json
  {
    "success": true,
    "data": {
      "portfolio": {
        "holdings": [
          {
            "companyId": "string",
            "companyName": "string",
            "shares": "number",
            "currentPrice": "number",
            "currentValue": "number"
          }
        ],
        "total": {
          "shares": "number",
          "currentValue": "number",
          "cash": "number",
          "netWorth": "number"
        }
      },
      "marketWatch": [
        {
          "companyId": "string",
          "companyName": "string",
          "sector": "string",
          "currentPrice": "number",
          "changeDirection": "UP | DOWN | NONE",
          "changeAmount": "number",
          "changePercentage": "number",
          "highestRecorded": "number",
          "lowestRecorded": "number"
        }
      ]
    }
  }
  ```
- **Business Rules:**
  - `currentPrice` reflects latest market price.
  - `currentValue` is the total market value of all holdings.
  - `netWorth` = `currentValue` + `cash`.
  - `netWorth` is derived at request time and must never be persisted.
  - `changeDirection` indicates if `currentPrice` is greater, lesser, or equal to `previousPrice`.
