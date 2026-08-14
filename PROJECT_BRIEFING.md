# Trade Matrix Round 2: Project Briefing

**Document Type:** AI Assistant Onboarding Document  
**Status:** Active  
**Context:** Based on architectural analysis of `BACKEND.md`, `IMPLEMENTATION.md`, `prisma/schema.prisma`, and current source code.

---

## 1. Project Overview

**What problem this system solves:**  
This backend system powers "Round 2" of a trading competition. It acts as the direct continuation of "Round 1" where teams initially acquired stock portfolios. In Round 2, teams respond to released news bundles by analyzing information and negotiating trades for shares of various companies. The backend acts as the single source of truth, managing event state, validating transactions, updating market prices, and calculating leaderboards. 

**High-level workflow:**
1. **Import:** The Organizer imports portfolio data from Round 1.
2. **Start:** The Organizer starts the event.
3. **News Reveal:** The Organizer reveals an independent News Bundle, opening a trading window.
4. **Trading:** Participants analyze the news and negotiate trades (buyer and seller) for stocks.
5. **Trade Recording:** Team Captains submit SellRequests, Buyers accept them, and the Organizer approves them.
6. **Price Application:** The Organizer applies new market prices associated with the active News Bundle.
7. **Recalculation:** The backend recalculates market state, portfolios, net worth, and the leaderboard.
8. **Leaderboard Reveal:** The leaderboard becomes visible to all users.
9. **Repeat:** The cycle repeats with the next News Bundle.
10. **End:** The Organizer ends the event, and the final Net Worth determines the winner.

**Main actors:**
- **Organizer:** Event administrator and market maker.
- **Team Captain:** Trading representative for a team.
- **Participant:** Passive team member who analyzes data.

---

## 2. User Roles

The system uses three strict roles to enforce permissions.

### Organizer
- **Permissions:** Can import Round 1 data, start/end the event, reset the event, reveal News Bundles, apply market prices, approve/reject SellRequests, create Announcements, and access all Organizer APIs.
- **Restrictions:** Organizers are strictly administrative and do NOT belong to any team (`teamId` is null).
- **Expected responsibilities:** Facilitating the live event and acting as the clearinghouse for trades.

### Team Captain
- **Permissions:** Can access all participant functionality. Exclusively allowed to create SellRequests (as a seller) and accept/reject SellRequests (as a buyer).
- **Restrictions:** Can only act on behalf of their assigned team. Cannot perform Organizer actions.
- **Expected responsibilities:** Acting as the sole executor of trades for their team during an active News Bundle window.

### Participant
- **Permissions:** Can view market information, portfolios, announcements, and the leaderboard (when visible).
- **Restrictions:** Read-only access. Cannot create, accept, or reject SellRequests. Cannot perform Organizer actions.
- **Expected responsibilities:** Analyzing news, watching the market, and advising the Team Captain.

---

## 3. Authentication & Authorization

### Clerk Integration
The system uses **Clerk** as the primary identity provider for verifying JWTs, but Clerk does *not* dictate permissions or roles.

### User Provisioning Flow
- Users are **manually provisioned** in the backend database *before* the event starts.
- The backend does *not* automatically create users upon Clerk sign-in.
- When a user logs in via Clerk, the backend matches the `clerkId` from the JWT to a pre-existing `User` record in the database.
- Only users with an `ACTIVE` status in the database are allowed access.

### Middleware Chain
Every authenticated route flows through the following middleware sequence:
1. `clerkMiddleware()`: Verifies the Clerk JWT.
2. `requireAuth()`: Ensures the request contains a valid token.
3. `loadDbUser`: Custom middleware that extracts `userId` from the auth token, fetches the `User` from the database, and attaches it to `req.user`.

### Role-Based Access Control
- Authorization is strictly role-based and handled by a custom `requireRole(...allowedRoles)` middleware.
- Controllers should not implement role checks directly.

### Team Assignment Rules
- A `User` belongs to at most **one** Team.
- A `Team` must have exactly **one** `TEAM_CAPTAIN`.
- A `Team` typically has **three** `PARTICIPANT` users.
- Round 1 import validation explicitly requires that every imported team has exactly one captain assigned.

---

## 4. Database Design

The database is PostgreSQL (managed by Supabase) using Prisma ORM.

### Models & Purposes
1. **User:** Stores application-specific identities, roles, and team assignments. Connects to Clerk via `clerkId`.
2. **Team:** Represents a competing group. Owns a Portfolio, Trades, and SellRequests.
3. **Portfolio:** Represents financial assets (Cash). Contains `cash` and `reservedCash` to strictly enforce atomicity during pending trades.
4. **Holding:** Represents a Portfolio's ownership of a specific Company's stock. Contains `quantity` and `reservedQuantity`.
5. **Company:** Immutable reference data representing a tradable entity. Does not store mutable market state.
6. **Market:** Stores the mutable market state (prices) for exactly one Company. Contains `currentPrice`, `previousPrice`, `highPrice`, and `lowPrice`.
7. **Event:** A singleton record (`isSingleton = true`) coordinating the overall event state and the currently active News Bundle.
8. **NewsBundle:** A collection of news released simultaneously. Transitions from `PENDING` to `ACTIVE` to `COMPLETED`.
9. **News:** Individual news items belonging to a NewsBundle.
10. **SellRequest:** A temporary workflow entity representing a pending trade negotiation.
11. **Trade:** Historical ledger of finalized, approved trades.
12. **Announcement:** Messages broadcasted by the Organizer.

### Important Relationships & Constraints
- `Portfolio` -> `Holding`: Cascade delete. A portfolio owns many holdings.
- `Company` -> `Market`: Cascade delete. 1-to-1 relationship. Identity (Company) is separated from State (Market).
- `SellRequest` & `Trade`: Link a `SellerTeam`, `BuyerTeam`, and `Company`.
- Constraints: Soft deletes are NOT used. Entities like `SellRequest` are hard deleted when cleaned up. UUIDs are used for all primary keys.

---

## 5. Event Lifecycle

The `Event` model is a strict state machine.

### Event States & Transitions
- `WAITING`: Initial state.
- `DATA_IMPORTED`: Round 1 portfolios and holdings have been successfully created.
- `LIVE`: The event is currently running, and News Bundles can be revealed.
- `ENDED`: The event is over.

**Allowed Transitions:**
`WAITING` -> `DATA_IMPORTED` -> `LIVE` -> `ENDED`

### Event Invariants
- Only ONE Event record exists in the system.
- Administrative reset (`POST /event/reset`) is the only way to move backwards (to `WAITING`), effectively wiping runtime data.

---

## 6. Round Lifecycle (Trading Cycles)

The "Round" is driven by independent **News Bundles**.

### How Rounds Work
- A News Bundle goes from `PENDING` -> `ACTIVE`.
- When a bundle is `ACTIVE`, the Event's `activeNewsBundleId` is set to this bundle's ID.
- **Trading is ONLY allowed when:** `Event.status == LIVE` AND `Event.activeNewsBundleId != null`.
- Once the Organizer applies prices, the bundle becomes `COMPLETED` (irreversible).

### State Interactions
- When a bundle is active (`activeNewsBundleId != null`), the leaderboard is strictly hidden (`leaderboardVisible = false`).
- When prices are applied, `activeNewsBundleId` becomes `null`, and `leaderboardVisible` becomes `true`.

---

## 7. Team Management

- **Creation:** Teams are provisioned manually in the database prior to the event import.
- **Assignment:** Users are mapped to Teams via the `User.teamId` foreign key.
- **Roles:** The enforcement of 1 Captain and 3 Participants per team is an administrative/business invariant validated deeply during the Import process.

---

## 8. Current API Surface

The implementation is currently in its scaffolding phase. The only available endpoints are:

1. **Health Check**
   - **Method:** `GET`
   - **Route:** `/health`
   - **Auth:** None
   - **Role:** None
   - **Request Shape:** Empty
   - **Response Shape:** `{ success: true, data: { status: "ok", timestamp: "..." } }`

2. **Get Current User**
   - **Method:** `GET`
   - **Route:** `/auth/me`
   - **Auth:** Required (Clerk JWT)
   - **Role:** Any
   - **Request Shape:** Empty
   - **Response Shape:** `{ success: true, data: { <User Object> } }`

All other endpoints implied by the business logic (Trading, Organizer controls, Portfolios) are **not yet implemented**.

---

## 9. Business Rules

### Enforced Validations (Architectural Directives)
- **Source of Truth:** The backend calculates ALL derived values (Net Worth, Market Value, Leaderboard). The frontend MUST NOT calculate business data.
- **No Short Selling:** `Holding.quantity` must never drop below zero.
- **No Overspending:** `Portfolio.cash` must never drop below zero.
- **Reservations:** `SellRequests` immediately lock `reservedShares` for the seller and `reservedCash` for the buyer. These are enforced via Prisma/DB state.
- **Zero Holdings:** Holdings with `quantity == 0` must be hard deleted.
- **Historical Data:** Market price history is intentionally NOT stored. Only `currentPrice` and `previousPrice` are maintained. Per-company gain/loss calculations are explicitly forbidden.

### Permission Rules
- SellRequests involve three distinct approvals:
  1. Seller (Captain) creates the request.
  2. Buyer (Captain) accepts the request (`BUYER_PENDING` -> `ORGANIZER_PENDING`).
  3. Organizer approves the request (`ORGANIZER_PENDING` -> `COMPLETED`).

---

## 10. Current Implementation Status

**Completed Modules:**
- Database Schema (`prisma/schema.prisma`)
- Global architecture and business philosophy documentation
- Basic Express application setup (`src/server.ts`, `src/app.ts`)
- Authentication middleware (`clerkAuth`, `ensureClerk`, `loadDbUser`)
- Authorization middleware (`requireRole`)
- Standardized API response formatting and Error Handling middleware

**Partially Completed Modules:**
- User Repository (scaffolded `findByClerkId`)
- Auth Service

**Missing Modules (To Be Built):**
- **Engines:** `EventEngine`, `MarketEngine`, `PortfolioEngine`, `TradeEngine`, `ImportEngine`
- **Controllers/Routes:** Event management, Trading, Market Data, Portfolios, Leaderboard, Webhooks
- **Repositories:** For all models other than User
- **Sockets:** Socket.io dispatcher for real-time notifications

---

## 11. Frontend Requirements

- **Expected Auth Flow:** Frontend integrates `@clerk/clerk-react` (or similar), obtains a JWT session token, and passes it in the `Authorization: Bearer <token>` header for all API calls.
- **Expected API Usage:** Frontend exclusively fetches state via REST APIs. 
- **Socket Usage:** Frontend listens to Socket.IO events *only* as "ping" notifications indicating that data has changed. The frontend MUST NOT read business payloads from sockets; it must immediately trigger a REST API re-fetch.
- **Important Assumptions:** The frontend is "dumb". It simply renders what the backend provides. It must respect `leaderboardVisible` and hide the leaderboard accordingly.

---

## 12. Technical Stack

- **Runtime:** Node.js
- **Language:** TypeScript (strict mode)
- **Web Framework:** Express 5.x
- **Database:** PostgreSQL (hosted on Supabase)
- **ORM:** Prisma
- **Authentication:** Clerk
- **Validation:** Zod
- **Real-Time Communication:** Socket.IO
- **Logging:** Pino / pino-http
- **Infrastructure:** Render Free Tier

---

## 13. Future Roadmap

Based on the architectural documents, the immediate next steps for development include:

1. **Import Engine:** Implement Round 1 data parsing to seed Teams, Portfolios, and initial Holdings.
2. **Event & Market Engines:** Build the core state machine for the Event (`WAITING` -> `DATA_IMPORTED` -> `LIVE`) and the logic to reveal News Bundles and update market prices.
3. **Portfolio Engine:** Implement the complex derivation logic for Net Worth and Leaderboard calculations (which are derived dynamically, not persisted).
4. **Trade Engine:** Implement the SellRequest state machine, including share/cash reservation logic and the Organizer approval pipeline.
5. **Socket Dispatcher:** Centralize socket emission logic to notify clients of state changes.
6. **Controllers & Zod Validators:** Wire up HTTP endpoints to the Engines.
