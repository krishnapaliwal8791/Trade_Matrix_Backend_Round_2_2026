# Trade Matrix Round 2 Backend

Document Version: 1.0

Status: Active

Architecture Decisions: 14

---

## Documentation Philosophy

This document is the single source of truth for the backend implementation.

Only finalized architecture decisions are documented.

Unfinalized discussions, future ideas, and TODOs must never appear in this document.

Implementation must follow this document.

If implementation and documentation conflict, this document is considered authoritative.

---

## Event Overview

Round 2 is a continuation of Round 1. It begins after importing the portfolios generated in Round 1.

- The Organizer initializes the event by importing Round 1 data.
- The Organizer starts the event.
- During the event, independent News Bundles are revealed.
- Participants analyze news.
- Participants negotiate trades outside the system.
- The Organizer records finalized trades.
- The Organizer applies the predefined market prices associated with the active News Bundle.
- The backend updates market prices.
- The backend recalculates portfolios.
- The backend recalculates net worth.
- The leaderboard becomes visible automatically after prices are applied.
- The cycle repeats.
- The Organizer ends the event.
- Final Net Worth determines the winner.

---

## Event Workflow

```
WAITING
   │
   ▼
Import Round 1 Data
   │
   ▼
DATA_IMPORTED
   │
   ▼
Organizer Starts Event
   │
   ▼
LIVE
   │
   ▼
Reveal News Bundle
   │
   ▼
Participants Analyze News
   │
   ▼
Participants Negotiate Trades
   │
   ▼
Organizer Records Trades
   │
   ▼
Organizer Applies Prices
   │
   ▼
Backend Updates Market
   │
   ▼
Backend Recalculates Portfolios
   │
   ▼
Backend Recalculates Net Worth
   │
   ▼
Backend Recalculates Leaderboard
   │
   ▼
leaderboardVisible = true
   │
   ▼
Reveal Next News Bundle
   │
   ▼
Repeat Trading Cycle
   │
   ▼
Organizer Ends Event
   │
   ▼
Backend Recalculates Final Leaderboard
   │
   ▼
ENDED
```

---

## AD-001 — Backend Philosophy

- Backend is the single source of truth.
- All business logic resides exclusively in the backend.
- Frontend never calculates business data.
- Frontend only renders backend state.
- Backend modules are organized around business domains.
- Every business action is validated.
- Every state-changing operation is atomic.
- Socket events notify clients that data changed.
- Clients re-fetch updated data through REST APIs.
- Implement only the functionality required by participant and organizer workflows.

---

## AD-002 — Architecture

### Architecture Pattern

```
Controller
    │
    ▼
 Engine
    │
    ▼
Repository
    │
    ▼
Database
```

### Responsibilities

**Controller**

- HTTP
- Authentication
- Validation
- Response formatting

**Engine**

- Business logic
- State validation
- Transactions

**Repository**

- Database access only

**Database**

- Persistent storage

---

## AD-003 — Core Persisted Business Entities

- Event
- Team
- Portfolio
- Holding
- Trade
- Company
- Market
- News Bundle
- BundlePrice
- Announcement

### Important Decisions

- Holding is a database entity.
- Holding is NOT a business module.
- Portfolio owns Holdings.
- ImportEngine creates Holdings during Round 1 data import.
- TradeEngine updates Holdings during trading.
- PortfolioEngine reads Holdings.

### Principle

Not every persisted entity becomes a business module.

Business modules exist only when they own independent business behaviour.

### Intentionally NOT Business Modules

- Dashboard
- Holding
- Price History
- Market Update

---

## AD-004 — Event Lifecycle

### Event State Machine

```
WAITING
   │
   ▼
DATA_IMPORTED
   │
   ▼
 LIVE
   │
   ▼
ENDED
```

### Allowed Transitions

- `WAITING` → `DATA_IMPORTED`
- `DATA_IMPORTED` → `LIVE`
- `LIVE` → `ENDED`

### Forbidden Transitions

- `WAITING` → `LIVE`
- `WAITING` → `ENDED`
- `DATA_IMPORTED` → `WAITING`
- `DATA_IMPORTED` → `ENDED`
- `LIVE` → `WAITING`
- `LIVE` → `DATA_IMPORTED`
- `ENDED` → `WAITING`
- `ENDED` → `DATA_IMPORTED`
- `ENDED` → `LIVE`

### Administrative Recovery

```
POST /event/reset
```

- Allowed only when status is `DATA_IMPORTED` or `ENDED`.
- Reset clears all Round 2 runtime data and restores `WAITING`.
- Reset is NOT a business state transition.

### Event State Access

```
GET /event
```

- Implemented
- Allowed Consumers: ORGANIZER, TEAM_CAPTAIN, PARTICIPANT
- Returns the global Event singleton state.

### Event Start

```
POST /organizer/start-event
```

- Implemented
- Transitions `DATA_IMPORTED` → `LIVE`

---

## AD-005 — Event Entity

### Fields

- `id`
- `status`
- `activeNewsBundleId`
- `leaderboardVisible`

`id` exists because BACKEND.md is both the business and implementation blueprint.

### Notes

- Exactly one Event exists for the entire Round 2 system.
- The Event acts as the coordinator of the overall event state.
- Runtime behaviour of the Event is defined in AD-007.

---

## AD-006 — News Bundle Philosophy

A News Bundle follows the same philosophy as Packages from Round 1.

### News Bundle Statuses

Supported values:
- PENDING
- ACTIVE
- COMPLETED

**PENDING**
- Bundle exists but is not currently active.

**ACTIVE**
- Bundle is currently active.
- Teams may trade.
- SellRequest workflow is enabled.

**COMPLETED**
- Organizer successfully applied bundle prices.
- Bundle can never become ACTIVE again.

The COMPLETED state must be documented as irreversible.

### Properties

- Independent
- Can be revealed in any order
- Can be skipped
- Event may end with unrevealed bundles
- No predefined sequence
- No next bundle
- No previous bundle

### Event Maintains

- `activeNewsBundleId`
- Only one News Bundle may be active at a time.

---

### BundlePrice Philosophy

A News Bundle dictates market changes through absolute target prices, rather than mathematical modifiers (percentages).

A News Bundle contains exactly one BundlePrice for every Company in the system.

BundlePrice stores the final targetPrice for that company after the bundle is applied.

Percentage impacts are intentionally not stored. If percentage changes must be displayed, they are derived read-time values calculated as:
`((currentPrice - previousPrice) / previousPrice) * 100`

BundlePrice data is configuration data, not historical market data. It dictates the intended future state of the Market.

**BundlePrice Invariants**
- `targetPrice > 0`
- Every News Bundle has exactly one BundlePrice per Company.
- No runtime calculations occur during Apply Prices; the Target Price becomes the Current Price directly.

---

## AD-007 — Event Runtime Behaviour

### Initial LIVE

```
status = LIVE
activeNewsBundleId = null
leaderboardVisible = false
```

### Reveal Bundle

```
activeNewsBundleId = bundleId
leaderboardVisible = false
```

Allowed only when:

- `status == LIVE`
- `activeNewsBundleId == null`
- Bundle contains exactly one BundlePrice for every Company
- Every BundlePrice.targetPrice > 0

- Trading is now allowed.

### Trading Rules

Trading is allowed only when all of the following conditions are satisfied:

- `status == LIVE`
- `activeNewsBundleId != null`

If any of the above conditions is false, trade recording must not be allowed.

This defines the only valid trading window during the event.

### Apply Prices

Allowed only when:

- `status == LIVE`
- `activeNewsBundleId != null`

Backend:

- Fetches BundlePrice records for the active bundle
- Delegates all Market updates to MarketEngine
- MarketEngine maps BundlePrice.targetPrice to Market.newPrice and remains owner of updating `previousPrice`, `currentPrice`, `highPrice`, and `lowPrice`
- Recalculates Portfolios
- Recalculates Net Worth
- Recalculates Leaderboard

Then:

```
activeNewsBundleId = null
leaderboardVisible = true
```

### Reveal Next Bundle

```
leaderboardVisible = false
activeNewsBundleId = nextBundleId
```

Repeat until event ends.

### Organizer Ends Event

```
status = ENDED
activeNewsBundleId = null
leaderboardVisible = true
```

---

## AD-008 — Event Invariants

- `activeNewsBundleId != null` ⇒ `leaderboardVisible == false`
- `leaderboardVisible == true` ⇒ `activeNewsBundleId == null`
- `status != LIVE` ⇒ `activeNewsBundleId == null`

Any runtime combination outside these invariants is invalid and must never exist.

---

## AD-009 — Company & Market

### Company

Round 2 reuses the Company entity defined in Round 1 without modification.

Company acts as immutable reference data throughout Round 2.

Company information is never modified during the event.

Company does not represent market behaviour or stock prices.

---

### Market Philosophy

A Market represents the mutable market state of exactly one Company during Round 2.

Exactly one Market record exists for every Company.

Market is the single source of truth for stock prices throughout the event.

---

### Company and Market Separation

Company and Market intentionally represent different business concepts.

Company owns identity.

Market owns state.

Identity remains constant throughout the event.

Market state changes whenever prices are applied.

This separation prevents immutable business information from being mixed with mutable event state.

---

### Historical Market Data Philosophy

Round 2 intentionally does not maintain historical price timelines.

The backend does not store:

- Price History
- Candlestick Data
- Graph Data
- Historical Market Queries
- Time-series APIs

Only the immediately previous market price is retained.

The purpose of previousPrice is to communicate the impact of the latest News Bundle and improve participant engagement.

---

### Market Entity

Fields

- `id`
- `companyId`
- `previousPrice`
- `currentPrice`
- `highPrice`
- `lowPrice`

Every field exists because of an explicit business requirement.

No additional fields should be introduced without business justification.

---

### Market Ownership

MarketEngine is responsible for all market state updates.

Business operations update Market only through MarketEngine.

MarketEngine performs:

- `previousPrice = currentPrice`
- `currentPrice = newPrice`
- `highPrice = max(highPrice, currentPrice)`
- `lowPrice = min(lowPrice, currentPrice)`

This algorithm is executed for every market update, even when the new price equals the current price.

---

### Market Read Access

Market may be read by:

- PortfolioEngine
- TradeEngine
- Participant APIs
- Organizer APIs
- Leaderboard calculations

Reading Market never modifies Market.

---

### Market Invariants

The following conditions must always hold.

- `highPrice >= currentPrice`
- `lowPrice <= currentPrice`
- `highPrice >= lowPrice`
- `currentPrice > 0`
- `previousPrice > 0`

---

## AD-010 — Portfolio & Holding

### Portfolio Philosophy

A Portfolio represents the current financial assets owned by exactly one Team during Round 2.

Portfolio owns:

- Cash
- Reserved Cash
- Holdings

Portfolio does not own:

- Market Prices
- Company Information
- Trade History
- Net Worth
- Market Value
- Dashboard Statistics

Portfolio stores only persistent business state.

Derived values must never be persisted.

---

### Portfolio Entity

Fields

- `id`
- `teamId`
- `cash`
- `reservedCash`

`reservedCash` is implementation state used for cash reservation.
It does not represent derived data.
It is persisted because reservation enforcement requires atomic database validation.

No additional fields exist.

---

### Derived Portfolio Values

PortfolioEngine derives:

Market Value

= Sum(Holding.quantity × Market.currentPrice)

Net Worth

= Cash + Market Value

Available Cash Percentage

= Cash / Net Worth

Companies Owned

= Count(Holdings)

Total Shares

= Sum(Holding.quantity)

Holdings Summary

= Sector-wise aggregation of Market Value

None of these values are persisted.

---

### Leaderboard Philosophy

Leaderboard is a derived ranking of Teams ordered by Net Worth.

Leaderboard is not persisted.

Leaderboard is recalculated whenever portfolio values are recalculated.

Leaderboard derives information from Portfolio state.

Leaderboard does not own independent business state.

Final event ranking is determined by Net Worth.

---

### Tie Handling

Teams with identical Net Worth share the same rank.
Subsequent rank numbers are skipped.
Ranking uses competition ranking.

Example:

Rank 1: Team A (1000)
Rank 1: Team B (1000)
Rank 3: Team C (900)

No additional tie-breaker exists.

---

### Leaderboard Visibility

Leaderboard data may only be accessed when:

`leaderboardVisible == true`

When:

`leaderboardVisible == false`

Leaderboard data is unavailable.

The backend must not return leaderboard rankings while the leaderboard is hidden.

---

### Gain/Loss Philosophy

Round 2 intentionally does not calculate per-company Gain/Loss.

Reason:

Round 1 acquires stocks through package auctions rather than individual stock purchases.

No authoritative purchase price exists for individual companies.

Any Gain/Loss calculation would therefore be artificial.

The backend must never invent business data.

Accordingly:

- Gain/Loss values are not stored.
- Gain/Loss values are not derived.
- Gain/Loss columns are intentionally excluded from the participant portfolio UI.

---

### Holding Philosophy

A Holding represents a Portfolio's ownership of exactly one Company.

Holding answers business questions regarding ownership and reservations:

"How many shares of this company does this Portfolio currently own, and how many are reserved?"

Holding explicitly owns:

- quantity
- reservedQuantity

It does not own:

- Company Information
- Market Prices
- Current Value
- Cash
- Trade History

---

### Holding Entity

Fields

- `id`
- `portfolioId`
- `companyId`
- `quantity`
- `reservedQuantity`

`reservedQuantity` is implementation state used for share reservation.
It does not represent derived data.
It is persisted because reservation enforcement requires atomic database validation.

No additional fields exist.

---

### Holding Lifecycle

Holding is created when:

- Round 1 portfolios are imported.
- A trade introduces ownership of a previously unowned company.

Holding is updated when:

- Trades increase or decrease quantity.

Holding is deleted when:

- Quantity becomes zero.

Holdings with zero quantity must never exist.

---

### Holding Ownership

Holding represents Portfolio ownership.

Holding may only be modified by business operations that establish or transfer ownership.

Current business operations are:

- ImportEngine
- TradeEngine

No other business operation may modify Holding.

---

### Holding Invariants

The following conditions must always hold.

- `quantity > 0`
- Every Holding belongs to exactly one Portfolio.
- Every Holding references exactly one Company.
- Holdings with zero quantity must never exist.

---

## AD-011 — SellRequest & Trading Workflow

### SellRequest Philosophy

A SellRequest is a temporary workflow entity.

SellRequest exists only during the active News Bundle trading window.

SellRequest is deleted when the bundle closes.

SellRequest is not historical data.

Trade is historical data.

---

### SellRequest Lifecycle

SellRequest functionality is available only while a News Bundle is ACTIVE.

Current implementation determines this using:

- `status == LIVE`
- `activeNewsBundleId != null`

All SellRequest endpoints must fail outside the active trading window.

Each SellRequest contains exactly one Company.

Multi-company requests are forbidden.

Seller creates the request.

Backend validates all business rules before request creation.

---

### SellRequest State Machine

```
BUYER_PENDING
    ├── Buyer Accept → ORGANIZER_PENDING
    └── Buyer Reject → REJECTED

ORGANIZER_PENDING
    ├── Organizer Approve → COMPLETED
    └── Organizer Reject → REJECTED
```

COMPLETED and REJECTED are terminal states.

---

### Actor Permissions

**BUYER_PENDING**

- Buyer may Accept
- Buyer may Reject

**ORGANIZER_PENDING**

- Organizer may Approve
- Organizer may Reject

**COMPLETED**

- No actions allowed

**REJECTED**

- No actions allowed

**Seller Permissions**

- Seller acts only during request creation.
- Seller has no system actions after request creation.
- Seller participates physically during organizer verification only.

---

### SellRequest Validation Philosophy

Validation occurs at:

- Request Creation
- Buyer Acceptance
- Organizer Approval

Validation is re-executed at every stage.

Backend never trusts previous validation results.

---

### Reservation Philosophy

Reservation is owned by SellRequest.

Reservation is not an independent business entity.

Reservation exists only while SellRequest exists.

Seller shares are reserved when request is created.

Buyer cash is reserved when request is accepted.

Reservations prevent overselling and overspending.

Reservation is released when a SellRequest is resolved or removed during trade execution.
Any remaining reservations are released during bundle cleanup when SellRequests are deleted.

Reservation must never outlive its SellRequest.

---

### Reservation Ownership

Since reservation is implemented using aggregate reservation fields, explicitly document that SellRequest stores:

- `reservedShares`
- `reservedCash`

Purpose:

- Track the exact reservation created by that SellRequest.
- Support precise reservation release during:
  - buyer rejection
  - organizer rejection
  - organizer approval
  - bundle cleanup

Reservation lifetime remains bounded by SellRequest lifetime.

Reservation is created, maintained, and released as part of SellRequest operations.

No business operation may access or modify reservations independently of SellRequest.

---

### Trade Execution Philosophy

Trade execution may occur only through Organizer approval of a SellRequest.

Direct trade creation is forbidden.

Organizer approval is the only action that executes a trade.

Trade execution updates portfolios, holdings and trade history.

---

### Apply Prices Cleanup Rules

Organizer may not Apply Prices while any SellRequest is in ORGANIZER_PENDING.

Apply Prices requires:

- `status == LIVE`
- `activeNewsBundleId != null`
- ORGANIZER_PENDING count = 0

When the Organizer applies prices for a News Bundle:

1. The bundle status becomes COMPLETED.
2. Trading for that bundle immediately stops.
3. All SellRequests associated with that trading window are permanently deleted.
4. SellRequest endpoints become unavailable until another bundle becomes ACTIVE.

Additionally:

- Market updates are applied.
- Portfolio values are recalculated.
- Leaderboard is recalculated.
- All reservations are released.

Possible SellRequest states at cleanup:

- COMPLETED
- REJECTED
- BUYER_PENDING

After cleanup:

- No SellRequests remain.
- No reservations remain.

---

### SellRequest Invariants

- A SellRequest exists in exactly one state.
- State transitions are atomic.
- Only valid state transitions may occur.
- At most one concurrent transition may succeed.
- A SellRequest may be executed at most once.
- COMPLETED is terminal.
- REJECTED is terminal.
- Reservation lifetime is bounded by SellRequest lifetime.
- SellRequests cannot survive bundle closure.
- SellRequests cannot exist without an active News Bundle.
- Trades cannot exist without a completed SellRequest.
- A SellRequest is implicitly associated with the active News Bundle.

---

## AD-012 — Trade

### Trade Philosophy

A Trade represents a completed transfer of ownership between two Teams.

A Trade is immutable historical data.

A Trade is permanent.

A Trade is created only when an Organizer approves a SellRequest.

SellRequest and Trade are different business concepts.

SellRequest is temporary workflow data.

Trade is historical event data.

---

### Trade Entity

Fields

- `id`
- `sellerTeamId`
- `buyerTeamId`
- `companyId`
- `quantity`
- `pricePerShare`
- `createdAt`

The following values are intentionally NOT stored:

- `totalAmount`
- `companyName`
- `newsBundleId`

Reason:

- `totalAmount` is derived from `quantity × pricePerShare`.
- `companyName` belongs to Company.
- No business requirement exists for trade-to-bundle linkage.

---

### Trade Execution

When an Organizer approves a SellRequest, Trade execution occurs atomically.

Trade execution performs:

- Decrease Seller Holding quantity.
- Increase Buyer Holding quantity.
- Increase Seller Cash.
- Decrease Buyer Cash.
- Create Trade record.
- Release Seller reservation.
- Release Buyer reservation.
- Mark SellRequest as COMPLETED.

If a Holding quantity becomes zero after trade execution:

- Delete Holding.

Trade execution is atomic.

Either all operations succeed or none succeed.

---

### Trade Immutability

- Trades cannot be edited through business operations.
- Trades cannot be deleted through business operations.
- Any correction requires administrative database intervention.
- Organizer does not have trade edit functionality.
- Organizer does not have trade delete functionality.

---

### Trade Invariants

- Every Trade has exactly one seller.
- Every Trade has exactly one buyer.
- Every Trade references exactly one Company.
- `quantity > 0`
- `pricePerShare > 0`
- A Trade is created exactly once.
- A Trade cannot be modified after creation.
- A Trade cannot be deleted through business operations.
- Every Trade originates from Organizer approval of a SellRequest.

---

## AD-013 — Announcement

### Announcement Philosophy

Announcement is a permanent communication record.

Announcement is visible to all Organizers.

Announcement is visible to all Participants.

Announcement is independent of Trading.

Announcement is independent of News Bundles.

Announcement is independent of Leaderboard visibility.

Announcements survive until Event Reset.

---

### Announcement Entity

Fields

- `id`
- `message`
- `authorId`
- `createdAt`

No additional fields exist.

---

### Creation Rules

Only Organizers may create announcements.

Announcements may be created in any Event state:

- `WAITING`
- `DATA_IMPORTED`
- `LIVE`
- `ENDED`

---

### Broadcast Rules

When an announcement is created:

- Announcement is persisted.
- Announcement is broadcast to connected clients.
- Clients re-fetch announcement data.

---

### Announcement Immutability

- Announcements cannot be edited through business operations.
- Announcements cannot be deleted through business operations.

---

### Reset Behaviour

Event Reset deletes all announcements.

Reset restores the system to a fresh Round 2 state.

---

### Announcement Invariants

- Every Announcement has exactly one author.
- Announcement content is immutable after creation.
- Announcements are visible to all users.
- Announcements may exist regardless of Event state.

---

## AD-014 — Round 1 Data Import

### Import Philosophy

Round 2 begins by importing finalized business data from Round 1.

Import is the only mechanism that transitions the Event from:

`WAITING` → `DATA_IMPORTED`

If import fails, the Event state must remain unchanged.

Partial imports must never exist.

Import is atomic.

Either all required data is imported successfully or nothing is imported.

---

### Import Source

Round 1 exposes a dedicated import endpoint.

Round 2 consumes that endpoint.

Round 2 trusts Round 1 only as a data source.

Round 2 owns all imported records after import completes.

Subsequent changes in Round 1 must not affect Round 2.

---

### Data Imported From Round 1

Import the following business data:

**Teams**

- `id`
- `name`

**Portfolios**

- `teamId`
- `cash`

**Holdings**

- `companyId`
- `quantity`

**Companies**

All company reference data required by Round 2.

Round 2 Market records are created from imported Companies.

---

### Data NOT Imported From Round 1

The following data must never be imported:

- Clerk Users
- Authentication Data
- Roles
- Sessions
- Tokens
- Organizer Accounts
- Participant Accounts

Round 2 owns authentication independently.

Round 2 uses a separate Clerk project.

---

### User Provisioning Philosophy

Before import occurs, Organizer manually provisions Round 2 users.

User fields:

- `clerkId`
- `name`
- `email`
- `role`
- `teamId`

Valid roles:

- `ORGANIZER`
- `TEAM_CAPTAIN`
- `PARTICIPANT`

Users may reference Team IDs before Team records exist.

This is intentional.

Team records are created later during Round 1 import.

Exactly one TEAM_CAPTAIN must exist per Team.

---

### Import Validation

Before import begins, validate:

- Round 1 endpoint reachable
- Response valid
- Teams valid
- Portfolios valid
- Holdings valid
- Companies valid
- Every referenced Team exists in imported data
- Every referenced Company exists in imported data

Any validation failure aborts the import.

No data may be persisted.

---

### Import Failure Philosophy

Import failures must be diagnosable.

Backend must return the reason for failure.

Examples:

- Round 1 unavailable
- Invalid response
- Missing Team
- Missing Company
- Invalid Portfolio
- Invalid Holding

Import failure must not modify existing Round 2 data.

---

### Successful Import

On successful completion:

- Teams created
- Portfolios created
- Holdings created
- Companies created
- Markets initialized
- Event status becomes `DATA_IMPORTED`

This transition occurs only after all import work succeeds.

---

### Reset Behaviour

Reset returns Round 2 to the exact state that existed before successful Round 1 import.

- All imported Round 1 data is removed.
- All runtime-generated trading data is removed.
- All organizer-created setup data that existed before import is preserved.
- Any data created directly or indirectly by Round 1 import or Round 2 runtime activity must be removed during reset, even for entities introduced later.

*(Implementation Detail: preserved entities include Users, Clerk mappings, Roles, News Bundles, News Items, Event record. Removed entities include Teams, Companies, Markets, Portfolios, Holdings, Trades, SellRequests, Announcements.)*

---

### Import Invariants

- Import may execute only when Event status is `WAITING`.
- `WAITING` → `DATA_IMPORTED` occurs only through successful import.
- Failed import leaves Event unchanged.
- Import is atomic.
- Partial imports are forbidden.
- Round 2 authentication is independent from Round 1.
- User records may exist before Team records.
- Exactly one TEAM_CAPTAIN must exist per Team.
- Reset must not remove manually provisioned users.

---

End of Version 1

Locked Architecture Decisions

- AD-001
- AD-002
- AD-003
- AD-004
- AD-005
- AD-006
- AD-007
- AD-008
- AD-009
- AD-010
- AD-011
- AD-012
- AD-013
- AD-014
