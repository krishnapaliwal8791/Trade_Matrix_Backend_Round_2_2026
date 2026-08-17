# Trade Matrix Round 2 Implementation

Document Version: 1.0

Status: Active

Implementation Decisions: 9

---

## Documentation Philosophy

This document defines engineering implementation decisions for Trade Matrix Round 2.

Business architecture is defined in BACKEND.md.

Business rules documented in BACKEND.md are not repeated here.

BACKEND.md is the authoritative source for business behaviour.

If implementation and business architecture conflict, BACKEND.md is considered authoritative.

---

## IMP-001 — Technology Stack

### Philosophy

- Reliability over complexity.
- Consistency with Round 1.
- Low operational cost.
- Suitable for approximately 100 participants.
- Avoid unnecessary infrastructure.

---

### Backend Runtime

Node.js

---

### Language

TypeScript (strict mode)

---

### Web Framework

Express

---

### Database

PostgreSQL (Supabase)

Supabase is used only as a managed PostgreSQL provider.

Business logic must not depend on Supabase-specific features.

---

### ORM

Prisma

---

### Authentication

Clerk

Round 2 uses a separate Clerk project from Round 1.

---

### Validation

Zod

- Controllers perform input validation using Zod.
- Engine classes perform business validation.
- Repositories never perform validation.

---

### Real-Time Communication

Socket.IO

- Sockets are notification mechanisms only.
- Clients must re-fetch data through REST APIs after receiving socket events.
- Sockets are not a source of business data.

---

### Logging

Pino is the logging framework.

Logs must be understandable by both developers and organizers.

Business failures should include:

- Error Code
- Reason
- Suggested Fix

---

### Deployment

Render Free Tier

Render Free Tier is acceptable for expected event scale.

Sleeping instances are an accepted tradeoff.

A health endpoint may be used before events to warm the instance.

---

### Source Control

GitHub

---

### Package Manager

npm

---

### Out of Scope Technologies

The following technologies are intentionally excluded:

- Redis
- Kafka
- RabbitMQ
- Kubernetes
- Docker Swarm
- Microservices

These may be reconsidered only if business requirements change.

---

## IMP-002 — Project Structure

This decision defines the backend layering and dependency rules.

---

### Architecture Philosophy

- Business logic belongs in Engines.
- Controllers remain thin.
- Repositories only access the database.
- Prisma is never used outside repositories.
- Backend follows strict dependency direction.

---

### Request Lifecycle

Every HTTP request flows through the following layers in order:

HTTP Request → Authentication → User Loading → Authorization → Validation → Controller → Engine → Repository → Prisma → Database

---

### Controller Responsibilities

Controllers are responsible for:

- HTTP handling
- Request validation
- Calling Engines
- Response formatting

Controllers must not:

- Contain business logic
- Access Prisma directly
- Execute database queries

---

### Engine Responsibilities

Engines are responsible for:

- Business rules
- State validation
- Transactions
- Coordination of repositories
- Socket notifications

Engines are the primary location for business behaviour.

---

### Repository Responsibilities

Repositories are responsible only for:

- Database access
- Prisma queries

Repositories must not:

- Contain business logic
- Emit socket events
- Perform authorization

---

### Socket Dispatcher

Purpose:

- Centralize socket emissions.
- Prevent socket logic from being scattered across engines.
- Engines invoke the dispatcher when business state changes.

Sockets are notification mechanisms only.

Clients must re-fetch state through REST APIs.

---

### Dependency Rules

Allowed:

- Controller → Engine
- Engine → Repository
- Repository → Prisma

Forbidden:

- Repository → Engine
- Engine → Controller
- Controller → Prisma
- Repository → Socket Dispatcher

---

### Folder Structure

The intended high-level structure:

```
src/
├── controllers/
├── engines/
├── repositories/
├── middleware/
├── sockets/
├── validators/
├── routes/
├── prisma/
├── types/
├── utils/
```

---

## IMP-003 — Error Handling & Logging

This decision defines error response standards, logging standards, and failure communication rules.

---

### Error Handling Philosophy

- Failures must be actionable.
- Errors must be understandable by both developers and organizers.
- Internal implementation details must not be exposed to clients.
- Every business failure should explain what failed, why it failed, and how to fix it.

---

### Standard Error Response

All non-success responses must follow a consistent structure.

Fields:

- success
- code
- message
- reason
- suggestedFix

Example:

```json
{
  "success": false,
  "code": "IMPORT_TEAM_NOT_FOUND",
  "message": "Import failed.",
  "reason": "Team 17 exists in Round 1 data but no Round 2 captain is assigned.",
  "suggestedFix": "Create the captain account for Team 17 and retry import."
}
```

---

### Standard Success Response

Define the standard success response as:

```json
{
  "success": true,
  "data": {}
}
```

Rules:

- success is mandatory.
- data is mandatory.
- Success responses must not contain reason.
- Success responses must not contain suggestedFix.
- Success responses must not contain generic human-readable success messages.
- A future optional meta field may be introduced if pagination or metadata becomes necessary.

---

### Error Categories

The system recognizes the following categories:

- AUTHENTICATION_ERROR
- AUTHORIZATION_ERROR
- VALIDATION_ERROR
- BUSINESS_RULE_ERROR
- NOT_FOUND_ERROR
- CONFLICT_ERROR
- INTERNAL_ERROR

These categories are implementation classifications only.

Business-specific error codes may exist within each category.

---

### Business Error Philosophy

Business errors are expected outcomes.

Examples:

- Insufficient shares
- Insufficient cash
- Invalid event state
- Hidden leaderboard access
- Import validation failure

Business errors must never be logged as system failures.

---

### Internal Error Philosophy

Internal errors represent unexpected failures.

Examples:

- Database outage
- Prisma failure
- External service failure
- Unhandled exception

Internal errors must be logged with full technical context.

Clients must receive a safe error response.

---

### Logging Philosophy

Pino is the single logging framework.

Logs must support:

- Organizer troubleshooting
- Developer debugging
- Event auditing

Logs should be readable by humans.

---

### Log Levels

Supported levels:

- INFO
- WARN
- ERROR

Usage:

**INFO**

- Successful business operations
- Event state transitions
- Trade approvals
- Price applications

**WARN**

- Business rule violations
- Invalid user actions
- Validation failures

**ERROR**

- Unexpected failures
- Infrastructure failures
- Unhandled exceptions

---

### Request Correlation

Every incoming request must receive a unique request identifier.

The request identifier must be included in all logs generated during that request lifecycle.

This allows tracing failures across the system.

---

### Log Context

Business logs should include relevant context when available:

- requestId
- userId
- teamId
- eventId
- operation
- result

Not every field is required for every log entry.

---

### Sensitive Data Rules

The following data must never appear in logs:

- Passwords
- Tokens
- Session secrets
- Clerk secrets
- Authentication credentials

Sensitive information must always be redacted.

---

### Client Error Exposure Rules

Clients must never receive:

- Stack traces
- Prisma errors
- SQL errors
- Internal implementation details

Such information belongs only in logs.

---

### Failure Communication Standard

Every business failure should answer:

- What failed?
- Why did it fail?
- How can it be fixed?

Error responses should be written so that a non-technical organizer can understand the corrective action.

---

## IMP-004 — Authentication & Authorization

This decision defines user identity, user provisioning, role management, authentication flow, and authorization rules.

---

### Authentication Philosophy

- Clerk is the identity provider.
- Authentication proves who the user is.
- Authentication does not determine permissions.
- Permissions are determined by backend user records.

---

### User Entity

The backend maintains its own User table.

Fields:

- id
- clerkId
- email
- name
- role
- teamId
- status

Purpose:

- Store application-specific permissions.
- Associate users with teams.
- Decouple business logic from Clerk.

---

### User Status

Supported values:

- ACTIVE
- INACTIVE

Purpose:

- Allow user access to be disabled without deleting historical records.
- Preserve team relationships and auditability.
- Support participant replacement and administrative corrections.

Only ACTIVE users may access the system.

---

### User Provisioning Philosophy

Round 2 users are provisioned manually before the event.

The backend does not automatically create users from Clerk sign-in.

A user must already exist in the backend before access is granted.

---

### Authentication Flow

Every request follows:

Clerk Authentication → Extract clerkId → Load User from Database → Attach User to Request Context → Authorization → Controller

If a matching User cannot be found:

- Access is denied.
- The request must not reach controllers.

If the User status is INACTIVE:

- Access is denied.
- The request must not reach controllers.

---

### Roles

Supported roles:

- ORGANIZER
- TEAM_CAPTAIN
- PARTICIPANT

No additional roles exist.

---

### Organizer Permissions

Organizers may:

- Import Round 1 data
- Start event
- End event
- Reset event
- Reveal News Bundles
- Apply Prices
- Approve SellRequests
- Reject SellRequests
- Create Announcements
- Access Organizer APIs

Organizers are not associated with teams.

---

### Team Captain Permissions

Team Captains may:

- Access endpoints under /users/*
- Create SellRequests
- Accept SellRequests as buyer
- Reject SellRequests as buyer

Captains belong to exactly one Team.

---

### Participant Permissions

Participants may:

- View market information
- View portfolios
- View announcements
- View leaderboard when visible
- View sell requests associated with their team

Participants may not:

- Create SellRequests
- Accept SellRequests
- Reject SellRequests
- Access Organizer functionality

Participants belong to exactly one Team.

---

### Team Ownership Rules

A Team contains:

- One TEAM_CAPTAIN
- Three PARTICIPANT users

The backend must enforce:

- A user belongs to at most one team.
- A team may have at most one TEAM_CAPTAIN.

During user provisioning, teams may temporarily exist without a captain.

However, Round 1 Import validation requires every imported team to have exactly one TEAM_CAPTAIN.

Import must fail if any imported team is missing a captain.

Reason:

The system should support incomplete provisioning during setup while still guaranteeing that imports cannot proceed with invalid team ownership.

---

### Authorization Philosophy

Authorization is role-based.

Controllers must not implement role checks directly.

Authorization must be performed through middleware.

---

### Authorization Middleware

The system should support middleware such as:

- requireOrganizer
- requireCaptain
- requireParticipant
- requireTeamMember

Purpose:

- Centralize authorization logic.
- Prevent duplicated role checks.

---

### Request Context

After authentication succeeds, request context should contain:

- userId
- role
- teamId

Controllers and Engines should use request context rather than querying Clerk.

---

### Clerk Independence

Business logic must never depend directly on Clerk APIs.

Engines must use backend User records only.

If Clerk is replaced in the future, business logic should remain unchanged.

---

## IMP-005 — Database Design

This decision defines database philosophy, persistence rules, identifiers, timestamps, constraints, transactions, and indexing strategy.

---

### Database Philosophy

- PostgreSQL is the single source of persisted data.
- Prisma schema must reflect business entities defined in BACKEND.md.
- Persist only business state.
- Derived values must never be persisted.

Examples of derived values:

- Net Worth
- Market Value
- Leaderboard Rank
- Holdings Summary
- Available Cash Percentage

---

### ID Strategy

All persisted entities use UUID identifiers.

Properties:

- Generated by the backend/database.
- Globally unique.
- Immutable.
- Never reused.

---

### Timestamp Strategy

Persisted entities should include:

- createdAt
- updatedAt

Purpose:

- Auditing
- Debugging
- Administrative investigation

Business entities may introduce additional timestamps when required by business rules.

---

### Soft Delete Philosophy

Round 2 uses hard deletes by default.

Deleted records are physically removed.

Examples:

- Holding removed when quantity becomes zero.
- SellRequests removed during bundle cleanup.

Soft deletes are not used unless explicitly required by future business requirements.

---

### Foreign Key Philosophy

Referential integrity must be enforced by the database.

Orphaned records must never exist.

All relationships should be represented through foreign keys.

---

### Unique Constraint Philosophy

The database should enforce business uniqueness rules whenever possible.

Examples include:

- User.clerkId
- User.email
- Portfolio.teamId
- Market.companyId
- Holding(portfolioId, companyId)

Additional constraints may exist as required by specific entities.

---

### Transaction Philosophy

Multi-entity business operations must execute within database transactions.

Examples:

- Trade execution
- Round 1 import
- Apply Prices
- Event reset

Business operations must succeed completely or fail completely.

Partial completion is forbidden.

---

### Index Philosophy

Indexes should exist for frequently queried fields.

Examples:

- clerkId
- teamId
- companyId
- portfolioId
- status
- SellRequest state

Indexing decisions should favor event responsiveness over storage optimization.

---

### Prisma Philosophy

Prisma is the only ORM used by the system.

Prisma access is restricted to repositories.

Controllers and Engines must never import Prisma directly.

Repositories expose business-oriented operations rather than raw database queries.

---

### Seed Data Philosophy

The system may seed:

- Event record
- NewsBundle
- News
- BundlePrice

Administrative users may be provisioned separately.

The system must not seed:

- Teams
- Companies
- Markets
- Portfolios
- Holdings
- Trades
- SellRequests

Reason:

Companies are imported from Round 1.

Markets are created during successful Round 1 import.

All runtime business data is created through import or business workflows.

---

### Database Independence

Business logic must not depend on Supabase-specific features.

The system should remain portable to any PostgreSQL-compatible provider.

---

## IMP-006 — Event State Management

This decision defines implementation behavior for event state management.

---

### Event State Philosophy

- No in-memory event state storage.
- No Redis-based state storage.
- No state duplication.

---

### Event Record Philosophy

There must be exactly one active Event record.

---

### Event State Source of Truth

Event state is stored in the database and is the single source of truth.

---

### Supported States

Supported states mirror the business states defined in BACKEND.md.

---

### State Transition Enforcement Philosophy

Controllers must never contain state transition logic.

---

### State Validation Ownership

Engines are responsible for state transition validation.

---

### Event State Access Pattern

The backend must always re-read current state from the database before executing state-sensitive operations.

---

### Event State Caching Philosophy

Event state must not be cached.

---

### Request-Time State Validation

State validation must occur at request time against the single source of truth.

---

### Transition Transaction Requirements

State transitions and related database updates must execute in a transaction.

---

### Transition Logging Requirements

Successful state transitions must generate audit logs.

---

### Socket Notification Requirements

Successful state transitions may emit socket notifications through the Socket Dispatcher.

---

### Failure Handling Requirements

Transitions must fail completely if they cannot be fully completed.

---

## IMP-007 — Participant & Team Captain API Contract

This decision defines the API contract exposed to Participants and Team Captains.

Users refers to both:

- PARTICIPANT
- TEAM_CAPTAIN

ORGANIZER is not considered a User for purposes of the /users/* API namespace.

Unless otherwise specified, all `/users/*` endpoints are accessible to both roles.

---

### GET /health

Purpose:

- Health check endpoint.
- Used for deployment monitoring and pre-event warmup.

Response:

```json
{
  "success": true,
  "data": {
    "status": "OK"
  }
}
```

---

### GET /auth/me

Purpose:

Return authenticated user information.

Access:

- PARTICIPANT
- TEAM_CAPTAIN
- ORGANIZER

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cuid_xyz",
      "clerkId": "user_xyz",
      "role": "PARTICIPANT",
      "teamId": "cuid_team",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

### GET /event

Purpose:

Return current event state.
Allow frontend to determine:
- whether event has started
- whether event has ended
- whether leaderboard is visible
- whether a news bundle is active

Access:

- ORGANIZER
- PARTICIPANT
- TEAM_CAPTAIN

Response:

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

---

### GET /users/dashboard

Purpose:

Dashboard data shown immediately after login.
Combines portfolio summary and market watch information.

Access:

- PARTICIPANT
- TEAM_CAPTAIN

Response:

```json
{
  "success": true,
  "data": {
    "portfolio": {
      "holdings": [
        {
          "companyId": "company_cuid",
          "companyName": "Reliance",
          "shares": 10,
          "currentPrice": 2900,
          "currentValue": 29000
        }
      ],
      "total": {
        "shares": 50,
        "currentValue": 68150,
        "cash": 32000,
        "netWorth": 100150
      }
    },
    "marketWatch": [
      {
        "companyId": "company_cuid",
        "companyName": "Reliance",
        "sector": "Energy",
        "currentPrice": 2900,
        "changeDirection": "UP",
        "changeAmount": 80,
        "changePercentage": 2.84,
        "highestRecorded": 3220,
        "lowestRecorded": 1980
      }
    ]
  }
}
```

Rules:

- currentPrice reflects latest market price.
- During Round 1 import, the imported stock price is stored as currentPrice.
- currentValue is the total market value of all holdings.
- cash is the team's available cash balance.
- netWorth = currentValue + cash.
- netWorth is derived at request time and must never be persisted.
- changeDirection values:
  - UP
  - DOWN
  - NONE

---

### GET /users/team

Purpose:

Return team information and members.

Access:

- PARTICIPANT
- TEAM_CAPTAIN

Response:

```json
{
  "success": true,
  "data": {
    "id": "team_cuid",
    "name": "Team Name",
    "captain": {
      "id": "captain_cuid",
      "name": "Captain Name"
    },
    "members": [
      {
        "id": "user_cuid",
        "name": "Member Name"
      }
    ]
  }
}
```

Rules:

- captain is not duplicated inside members.
- members contains only PARTICIPANT users.
- captain is always present for imported teams.
- captain may be null only before Round 1 import is executed.

---

### GET /users/companies

Purpose:

Return all companies available in the market.

Access:

- PARTICIPANT
- TEAM_CAPTAIN

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "cuid_co_1",
      "name": "Tech Corp",
      "sector": "Technology",
      "description": "A leading technology company.",
      "logo": "https://example.com/logo.png",
      "currentPrice": 500
    }
  ]
}
```

Rules:

- During Round 1 import, the imported stock price must be stored as market.currentPrice.
- Market owns: currentPrice, previousPrice, highPrice, lowPrice.
- market.currentPrice is persisted in the database.
- market.currentPrice is updated whenever organizer applies prices.
- Market is the authoritative source of stock prices.
- Company remains immutable reference data.
- market.currentPrice is used for dashboard calculations.
- market.currentPrice is used for leaderboard calculations.
- market.currentPrice is used for sell request validation.
- Results are sorted alphabetically by company name.

---

### GET /users/active-news-bundle

Purpose:

Return currently active news bundle.

Access:

- PARTICIPANT
- TEAM_CAPTAIN

Response:

```json
{
  "success": true,
  "data": {
    "id": "bundle_cuid",
    "title": "Bundle 1",
    "releasedAt": "2026-07-17T09:00:00.000Z"
  }
}
```

Rules:

- Return null when no bundle is active.
- Only the currently active bundle is returned.
- Future bundles are never exposed through this endpoint.

If no active news bundle exists, return:

```json
{
  "success": true,
  "data": null
}
```

---

### GET /users/news-bundles/:id

Purpose:

Return full news bundle details.

Access:

- PARTICIPANT
- TEAM_CAPTAIN

Response:

```json
{
  "success": true,
  "data": {
    "id": "bundle_cuid",
    "title": "Bundle 1",
    "releasedAt": "2026-07-17T09:00:00.000Z",
    "news": [
      {
        "id": "news_cuid",
        "title": "Reliance Expansion",
        "content": "..."
      }
    ]
  }
}
```

Rules:

- Users may access only bundles that have already been released.
- Accessing unreleased future bundles must fail.

---

### GET /users/leaderboard

Purpose:

Return leaderboard when visible.

Access:

- PARTICIPANT
- TEAM_CAPTAIN

Response:

```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "teamId": "team_cuid",
      "teamName": "Team Alpha",
      "netWorth": 250000
    }
  ]
}
```

Rules:

- Endpoint must fail if leaderboardVisible = false.
- netWorth = portfolio cash + market value of holdings using market.currentPrice.
- Teams are sorted by netWorth descending.
- Teams with identical Net Worth share the same rank.
- Subsequent rank numbers are skipped.
- Ranking uses competition ranking.

---

### GET /announcements

Purpose:

Return announcements visible to all users.

Access:

- PARTICIPANT
- TEAM_CAPTAIN
- ORGANIZER

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "cuid_announcement",
      "message": "Auction will resume in 5 minutes.",
      "createdAt": "2026-07-17T09:00:00.000Z",
      "author": {
        "id": "cuid_author",
        "name": "Jane Smith"
      }
    }
  ]
}
```

Rules:

- Results are sorted by createdAt descending.
- Newest announcements appear first.

---

### GET /users/sell-requests/:id

Purpose:

Return complete details of a sell request.

Access:

- PARTICIPANT of team associated as seller or buyer.
- TEAM_CAPTAIN of team associated as seller or buyer.

Response:

```json
{
  "success": true,
  "data": {
    "id": "request_cuid",
    "company": {
      "id": "company_cuid",
      "name": "Reliance"
    },
    "sellerTeam": {
      "id": "team_a",
      "name": "Team Alpha"
    },
    "buyerTeam": {
      "id": "team_b",
      "name": "Team Beta"
    },
    "quantity": 20,
    "pricePerShare": 2800,
    "currentPrice": 2900,
    "totalAmount": 56000,
    "status": "BUYER_PENDING",
    "rejectedBy": null,
    "createdAt": "2026-07-17T09:00:00.000Z"
  }
}
```

Rules:

- currentPrice represents the company's latest current market price at request time.
- currentPrice is informational only and does not affect the historical trade price.

---

### GET /participant/sell-requests

Purpose:

Show every sell request associated with the participant's team.

Access:

- PARTICIPANT

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "request_cuid",
      "companyName": "Reliance",
      "quantity": 20,
      "pricePerShare": 2800,
      "currentPrice": 2900,
      "status": "BUYER_PENDING",
      "rejectedBy": null,
      "sellerTeamName": "Team Alpha",
      "buyerTeamName": "Team Beta",
      "createdAt": "2026-07-17T09:00:00.000Z"
    }
  ]
}
```

Rules:

- Includes requests where team is buyer.
- Includes requests where team is seller.
- Results must be sorted by createdAt descending.
- If timestamps are equal, sort by id descending.
- Newest requests appear first.
- currentPrice represents the company's latest current market price at request time.

---

### GET /team-captain/sell-requests

Purpose:

Return requests created by captain's team.

Access:

- TEAM_CAPTAIN

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "request_cuid",
      "companyName": "Reliance",
      "quantity": 20,
      "pricePerShare": 2800,
      "currentPrice": 2900,
      "status": "BUYER_PENDING",
      "rejectedBy": null,
      "buyerTeamName": "Team Beta",
      "createdAt": "2026-07-17T09:00:00.000Z"
    }
  ]
}
```

Rules:

- Results must be sorted by createdAt descending.
- If timestamps are equal, sort by id descending.
- Newest requests appear first.
- currentPrice represents the company's latest current market price at request time.

---

### GET /team-captain/sell-requests/incoming

Purpose:

Return requests where captain's team is buyer.

Access:

- TEAM_CAPTAIN

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "request_cuid",
      "companyName": "Reliance",
      "quantity": 20,
      "pricePerShare": 2800,
      "currentPrice": 2900,
      "sellerTeamName": "Team Alpha",
      "status": "BUYER_PENDING",
      "rejectedBy": null,
      "createdAt": "2026-07-17T09:00:00.000Z"
    }
  ]
}
```

Rules:

- Results must be sorted by createdAt descending.
- If timestamps are equal, sort by id descending.
- Newest requests appear first.
- currentPrice represents the company's latest current market price at request time.

---

### GET /team-captain/teams

Purpose:

Populate buyer team dropdown during sell request creation.

Access:

- TEAM_CAPTAIN

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "team_cuid",
      "name": "Team Beta"
    }
  ]
}
```

Rules:

- Captain's own team must not be returned.

---

### POST /team-captain/sell-requests

Purpose:

Create sell request.

Access:

- TEAM_CAPTAIN

Request:

```json
{
  "buyerTeamId": "team_cuid",
  "companyId": "company_cuid",
  "quantity": 20,
  "pricePerShare": 2800
}
```

Rules:

- Active news bundle required.
- Seller must own sufficient shares.
- Buyer team cannot equal seller team.
- pricePerShare minimum = 75% of current stock price.
- pricePerShare maximum = 100% of current stock price.
- Validation is inclusive.
- 75% and 100% are both valid values.
  - Example: currentPrice = 100, pricePerShare = 75 -> valid, pricePerShare = 100 -> valid
- Current stock price is latest market price.
- Sell request validation always uses market.currentPrice.
- During Round 1 import, imported stock prices are stored as currentPrice.

---

### POST /team-captain/sell-requests/:id/accept

Purpose:

Buyer accepts request.

Access:

- TEAM_CAPTAIN of buyer team.

Rules:

- Request must be BUYER_PENDING.

---

### POST /team-captain/sell-requests/:id/reject

Purpose:

Buyer rejects request.

Access:

- TEAM_CAPTAIN of buyer team.

Rules:

- Request must be BUYER_PENDING.
- rejectedBy must be recorded as BUYER.

---

### Sell Request Status

Supported values:

- BUYER_PENDING
- ORGANIZER_PENDING
- COMPLETED
- REJECTED

Definitions:

- BUYER_PENDING = awaiting buyer decision.
- ORGANIZER_PENDING = buyer accepted and awaiting organizer decision.
- COMPLETED = trade executed successfully.
- REJECTED = request rejected by buyer or organizer.

---

### Sell Request RejectedBy

Supported values:

- BUYER
- ORGANIZER

Rules:

- rejectedBy must be null unless status = REJECTED.
- BUYER indicates rejection by buyer captain.
- ORGANIZER indicates rejection by organizer.

Valid examples:

status = REJECTED
rejectedBy = BUYER

status = REJECTED
rejectedBy = ORGANIZER

status = COMPLETED
rejectedBy = null

status = BUYER_PENDING
rejectedBy = null

---

### SellRequest Endpoint Availability

SellRequest functionality is available only while a News Bundle is ACTIVE.
Any SellRequest endpoint (create, accept, reject, approve, list, etc.) must fail if accessed outside the active trading window.

---

## IMP-008 — Organizer API Contract

This decision defines the API contract exposed to Organizers.

---

### EVENT MANAGEMENT

#### POST /organizer/import-round1

Purpose:

Import Round 1 data to initialize the event.

Access:

- ORGANIZER

Response:

```json
{
  "success": true,
  "data": {}
}
```

Rules:

- ORGANIZER only.
- Allowed only when:
  - Event status = WAITING
- On success:
  - Event status becomes DATA_IMPORTED
- Every imported team must have exactly one TEAM_CAPTAIN.
- Import validation must complete before any writes occur.
- Import executes inside a database transaction.
- If import fails, no changes are persisted.
- Cannot be executed after event has started.

---

#### POST /organizer/start-event

Purpose:

Start the event.

Status: Implemented

Access:

- ORGANIZER

Response:

```json
{
  "success": true,
  "data": {}
}
```

Rules:

- ORGANIZER only.
- Allowed only when:
  - Event status = DATA_IMPORTED
- On success:
  - Event status becomes LIVE
- Cannot be executed twice.

---

#### POST /organizer/end-event

Purpose:

End the event.

Access:

- ORGANIZER

Response:

```json
{
  "success": true,
  "data": {}
}
```

Rules:

- ORGANIZER only.
- Allowed only when:
  - Event status = LIVE
- On success:
  - Event status becomes ENDED
- Cannot be executed twice.

---

#### POST /organizer/reset-event

Purpose:

Reset the event to a pristine state.

Access:

- ORGANIZER

Response:

```json
{
  "success": true,
  "data": {}
}
```

Rules:

- ORGANIZER only.
- Executes inside a transaction.
- Allowed only when:
  - Event status = DATA_IMPORTED
  - Event status = ENDED
- On success:
  - Event status becomes WAITING
- Reset must NOT be allowed from:
  - WAITING
  - LIVE
- activeNewsBundleId becomes null.
- leaderboardVisible becomes false.

Preserved data:
- Users
- Clerk mappings
- Roles
- News bundles
- News items
- Event record

Removed data:
- Teams
- Companies
- Markets
- Portfolios
- Holdings
- Trades
- Sell requests
- Announcements

News bundle state reset:
- All bundle statuses become PENDING.
- All releasedAt values become null.

Reset returns Round 2 to the exact state that existed before successful Round 1 import.
- All imported Round 1 data is removed.
- All runtime-generated trading data is removed.
- All organizer-created setup data that existed before import is preserved.
- Any data created directly or indirectly by Round 1 import or Round 2 runtime activity must be removed during reset, even for entities introduced later.

---

### NEWS BUNDLE MANAGEMENT

#### GET /organizer/news-bundles

Purpose:

Return all news bundles for organizer management.

Access:

- ORGANIZER

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "bundle_cuid",
      "title": "Bundle 1",
      "status": "PENDING",
      "releasedAt": null,
      "newsCount": 3,
      "bundlePriceCount": 15
    }
  ]
}
```

Rules:

- ORGANIZER only.
- Return all bundles.
- Bundle statuses (PENDING, ACTIVE, COMPLETED) are determined according to the rules in BACKEND.md.
- Counts are derived at read time.
- News entities are not returned.
- BundlePrice entities are not returned.
- Only counts are exposed.

---

#### POST /organizer/news-bundles/:id/reveal

Purpose:

Reveal a pending news bundle.

Access:

- ORGANIZER

Response:

```json
{
  "success": true,
  "data": {}
}
```

Rules:

- ORGANIZER only.
- Event must be LIVE.
- Bundle must exist.
- Bundle must be PENDING.
- No ACTIVE bundle may already exist.
- Bundle must contain exactly one BundlePrice for every Company.
- All BundlePrice.targetPrice values must be > 0.
- Bundle becomes ACTIVE.
- releasedAt is set.
- activeNewsBundleId is updated.
- leaderboardVisible becomes false.
- Executes inside a transaction.
- ACTIVE or COMPLETED bundles cannot be revealed again.

---

### PRICE APPLICATION

#### GET /organizer/markets

Purpose:

Fetch all market data.

Access:

- ORGANIZER

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "market_cuid",
      "companyId": "company_cuid",
      "currentPrice": 2900
    }
  ]
}
```

Rules:

- ORGANIZER only.

---

#### POST /organizer/apply-prices

Purpose:

Apply the next set of stock prices.

Access:

- ORGANIZER

Response:

```json
{
  "success": true,
  "data": {}
}
```

Rules:

- ORGANIZER only.
- Event must be LIVE.
- Active news bundle required (`activeNewsBundleId != null`).
- Bundle must be ACTIVE.
- Bundle must not be COMPLETED.
- ORGANIZER_PENDING SellRequest count must be 0.
- The active bundle must contain exactly one BundlePrice for every Company.
- All BundlePrice.targetPrice values must be > 0.
- All company prices are updated atomically.
- Fetches BundlePrice records and maps `targetPrice` to `newPrice` via MarketEngine.
- MarketEngine strictly maintains `previousPrice`, `currentPrice`, `highPrice`, and `lowPrice`.
- All SellRequest records are deleted (releasing reservations implicitly).
- Bundle becomes COMPLETED.
- activeNewsBundleId becomes null.
- leaderboardVisible becomes true.
- Executes inside a transaction.
- Cannot be executed twice for the same bundle.

---

### SELL REQUEST MODERATION

#### GET /organizer/sell-requests

Purpose:

Return all sell requests for moderation.

Access:

- ORGANIZER

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "request_cuid",
      "companyName": "Reliance",
      "quantity": 20,
      "pricePerShare": 2800,
      "currentPrice": 2900,
      "status": "ORGANIZER_PENDING",
      "rejectedBy": null,
      "sellerTeamName": "Team Alpha",
      "buyerTeamName": "Team Beta",
      "createdAt": "2026-07-17T09:00:00.000Z"
    }
  ]
}
```

---

#### GET /organizer/sell-requests/:id

Purpose:

Return specific sell request for moderation.

Access:

- ORGANIZER

Response:

```json
{
  "success": true,
  "data": {
    "id": "request_cuid",
    "company": {
      "id": "company_cuid",
      "name": "Reliance"
    },
    "sellerTeam": {
      "id": "team_a",
      "name": "Team Alpha"
    },
    "buyerTeam": {
      "id": "team_b",
      "name": "Team Beta"
    },
    "quantity": 20,
    "pricePerShare": 2800,
    "currentPrice": 2900,
    "totalAmount": 56000,
    "status": "ORGANIZER_PENDING",
    "rejectedBy": null,
    "createdAt": "2026-07-17T09:00:00.000Z"
  }
}
```

---

#### POST /organizer/sell-requests/:id/approve

Purpose:

Approve a pending sell request.

Access:

- ORGANIZER

Response:

```json
{
  "success": true,
  "data": {}
}
```

Rules:

- ORGANIZER only.
- Status must be ORGANIZER_PENDING.
- Shares transfer.
- Cash transfer.
- Trade record created.
- Status becomes COMPLETED.
- Executes inside a transaction.
- Cannot be approved twice.

---

#### POST /organizer/sell-requests/:id/reject

Purpose:

Reject a pending sell request.

Access:

- ORGANIZER

Response:

```json
{
  "success": true,
  "data": {}
}
```

Rules:

- ORGANIZER only.
- Status must be ORGANIZER_PENDING.
- Status becomes REJECTED.
- rejectedBy becomes ORGANIZER.
- Cannot be rejected twice.

---

### ANNOUNCEMENTS

#### POST /organizer/announcements

Purpose:

Create a new announcement.

Access:

- ORGANIZER

Request:

```json
{
  "message": "Market closes in 10 minutes."
}
```

Response:

```json
{
  "success": true,
  "data": {}
}
```

Rules:

- ORGANIZER only.
- message required.

---

### USER MANAGEMENT

User provisioning is performed before the event.

Round 2 does not support runtime user creation.

Round 2 does not support runtime user editing.

Round 2 does not support runtime user deletion.

---

### Idempotency Rules

- Import twice -> fail.
- Start LIVE event -> fail.
- End ENDED event -> fail.
- Reveal ACTIVE bundle -> fail.
- Reveal COMPLETED bundle -> fail.
- Apply prices twice -> fail.
- Approve COMPLETED request -> fail.
- Reject REJECTED request -> fail.

---

## IMP-009 — Organizer Monitoring APIs

### Philosophy

These endpoints exist to help organizers investigate team state during the live event.

They are read-only endpoints.

They do not modify business state.

---

### GET /organizer/teams

Purpose:

Return all teams for organizer monitoring.

Access:

- ORGANIZER

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "team_cuid",
      "name": "Team Alpha",
      "cash": 50000,
      "currentValue": 98000,
      "netWorth": 148000
    }
  ]
}
```

Rules:

- ORGANIZER only.
- Results sorted alphabetically by team name.
- currentValue is derived using current market prices.
- netWorth = cash + currentValue.
- currentValue is derived at request time.
- netWorth is derived at request time.
- Neither currentValue nor netWorth may be persisted.

---

### GET /organizer/teams/:id

Purpose:

Return complete team information for organizer monitoring at any time.

Access:

- ORGANIZER

Response:

```json
{
  "success": true,
  "data": {
    "id": "team_cuid",
    "name": "Team Alpha",

    "portfolio": {
      "cash": 50000,
      "currentValue": 98000,
      "netWorth": 148000
    },

    "captain": {
      "id": "captain_cuid",
      "name": "Captain Name",
      "email": "captain@example.com"
    },

    "members": [
      {
        "id": "user_cuid",
        "name": "Member Name",
        "email": "member@example.com"
      }
    ],

    "holdings": [
      {
        "companyId": "company_cuid",
        "companyName": "Reliance",
        "shares": 20,
        "currentPrice": 2900,
        "currentValue": 58000
      }
    ],

    "activeBundle": true,
    "sellRequestsSummary": {
      "buyerPending": 1,
      "organizerPending": 2,
      "completed": 5,
      "rejected": 1
    }
  }
}
```

Rules:

- ORGANIZER only.
- Team details are always available.
- If a News Bundle is ACTIVE:
  - activeBundle = true
  - sellRequestsSummary contains counts for the active bundle.
- If no News Bundle is ACTIVE:
  - activeBundle = false
  - sellRequestsSummary = null
- Details of currently existing sell requests are available through: GET /organizer/teams/:id/sell-requests.
- Organizer monitoring endpoints may expose user email addresses.
- currentValue is derived using current market prices.
- netWorth = cash + currentValue.
- currentValue is derived at request time.
- netWorth is derived at request time.
- Holdings include only currently owned shares.
- captain is not duplicated in members.

---

### GET /organizer/teams/:id/sell-requests

Purpose:

Return all currently existing sell requests associated with a team during the active bundle.

Access:

- ORGANIZER

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "request_cuid",
      "companyName": "Reliance",
      "quantity": 20,
      "pricePerShare": 2800,
      "currentPrice": 2900,
      "status": "COMPLETED",
      "rejectedBy": null,
      "sellerTeamName": "Team Alpha",
      "buyerTeamName": "Team Beta",
      "createdAt": "2026-07-17T09:00:00.000Z"
    }
  ]
}
```

Rules:

- ORGANIZER only.
- Endpoint must fail if no News Bundle is ACTIVE.
- Includes requests where team is seller.
- Includes requests where team is buyer.
- Includes:
  - BUYER_PENDING
  - ORGANIZER_PENDING
  - COMPLETED
  - REJECTED
- Results sorted by createdAt descending.
- If timestamps are equal, sort by id descending.
- currentPrice represents the company's latest current market price at request time.

---

End of Version 1

Locked Implementation Decisions

- IMP-001
- IMP-002
- IMP-003
- IMP-004
- IMP-005
- IMP-006
- IMP-007
- IMP-008
- IMP-009

## IMP-010 — Reservation Persistence Strategy

Reservation is implemented using aggregate reservation fields.

Holding stores:
- `reservedQuantity`

Portfolio stores:
- `reservedCash`

Available values are derived:
- `availableShares = quantity - reservedQuantity`
- `availableCash = cash - reservedCash`

SellRequest stores:
- `reservedShares`
- `reservedCash`

Reservation fields on Holding and Portfolio represent aggregate reserved amounts across all active SellRequests.

Reservation fields on SellRequest represent the reservation owned by that specific SellRequest.

Reservation is not an independent business entity.

Separate reservation tables must not be introduced.

The purpose is:
- Prevent overselling.
- Prevent overspending.
- Allow accurate reservation release when a specific SellRequest is completed, rejected, or removed during bundle cleanup.
