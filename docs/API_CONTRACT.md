# API contract — WASSIA front-end ↔ back-end

> **Since 2026-11-20 the real back end ("Registre Wassia", OpenAPI at `GET /openapi.json`) is the reference.** Routes it exposes are called directly (see `docs/INTEGRATION_MAP.md`); this document now only describes the **mock** routes that are still served by the fake back end under `/api/v1` until the real back end exposes an equivalent.

Base path: `/api/v1`. JSON only. Dates are ISO 8601 UTC strings. Amounts are **integers in FCFA** (never decimals).

## Authentication

`Authorization: Bearer <access token>` (Keycloak OIDC, code + PKCE). The front never derives role/permissions from the token: it always reads `GET /me`.

## Error format

Every non-2xx response returns:

```json
{
  "code": "CASH_LOCKED",
  "message": "La caisse est fermée depuis 16 h 00.",
  "details": { "amount": ["Montant obligatoire"] }
}
```

- `code`: stable, machine-readable, UPPER_SNAKE_CASE.
- `message`: plain French, shown to the user as is.
- `details`: optional, field → messages (used with 422).

| HTTP | When                                                                  |
| ---- | --------------------------------------------------------------------- |
| 400  | Malformed request                                                     |
| 401  | Not authenticated / token expired                                     |
| 403  | Authenticated but not allowed (permission or separation of duties)    |
| 404  | Resource not found                                                    |
| 409  | Conflict (state transition not allowed, duplicate, already processed) |
| 422  | Validation error (`details` filled)                                   |
| 500  | Server error                                                          |

## Pagination

Request: `?page=1&size=20&sort=createdAt,desc` (page is 1-based, max size 100).

Response:

```json
{ "items": [], "page": 1, "size": 20, "total": 0 }
```

## Endpoints

Endpoints are documented here as they are implemented. Every endpoint requires a logged-in user unless marked **public**. Agents (`AGENT`) only ever receive their own merchants, payments and loans. A role without the required permission gets 403 `FORBIDDEN`.

### Identity

#### `GET /me`

Current user and permissions. The front reads role and permissions **only** from here.

```json
{
  "user": {
    "id": "u-cash",
    "fullName": "Mariam Sylla",
    "phone": "07 00 00 10 05",
    "role": "CASHIER",
    "active": true
  },
  "permissions": [
    "collect.counter",
    "loan.view",
    "loan.disburse",
    "cash.view",
    "cash.closure.count"
  ]
}
```

Errors: 401 `UNAUTHENTICATED`.

Roles: `DG`, `DEPUTY_DG` (read-only), `BRANCH_MANAGER`, `MANAGER`, `ACCOUNTANT`, `CASHIER`, `AGENT`. Permission names: see `src/app/core/config/permissions.config.ts`.

#### `GET /roles`

`[{ role, label, hint, permissions[] }]` — read-only view of the role matrix.

### Reference data

| Endpoint              | Response                                                                     | Access   |
| --------------------- | ---------------------------------------------------------------------------- | -------- |
| `GET /users?role=&q=` | `Page<User>` (default sort `fullName,asc`)                                   | any user |
| `GET /settings`       | `{ cashCeiling, cashCutoffTime: "16:00", cashCountTime: "16:30" }`           | any user |
| `GET /payment-types`  | `PaymentType[]` — `{ id, code, label, defaultAmount?, fixedAmount, active }` | any user |

### Members, cards, payments, loans (read)

| Endpoint            | Filters                                                                                      | Response                                                                        | Access (any of)                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `GET /members`      | `status`, `market`, `agentId`, `q` (name, phone, account or card number; accent-insensitive) | `Page<Member>`                                                                  | enrollment.monitor, merchants.view, member.enroll, collect.counter, loan.view                            |
| `GET /members/{id}` | —                                                                                            | `{ member, card or null, payments (20 latest), loans }`; 404 `MEMBER_NOT_FOUND` | same                                                                                                     |
| `GET /cards`        | `status`, `memberId`, `q` (printed number); default sort `printedNumber,asc`                 | `Page<Card>`                                                                    | cards.manage, card.assign, merchants.view, enrollment.monitor                                            |
| `GET /payments`     | `status`, `channel`, `memberId`, `typeId`, `agentId`                                         | `Page<Payment>`                                                                 | collect.field, collect.counter, cash.view, ledger.view, reconciliation, merchants.view, supervision.view |
| `GET /loans`        | `status`, `memberId`                                                                         | `Page<Loan>`                                                                    | loan.view, loan.request                                                                                  |

Model shapes: `src/app/core/models/*.model.ts`. Notes:

- `Member.savings` is the prepaid card balance (integer FCFA).
- `Card.qrToken` is an opaque random token; the printed number (`WAS-000124`) is never in the QR.
- `Loan.total` / `Loan.monthly` follow the official grid (fixed rate on the amount, monthly rounded down, remainder on the last instalment).

### Field agent — enrollment (Phase 2)

Client rule (2026-11-10): the agent registers a merchant **only once the 1 000 F membership fee has been received on the spot** — in cash, or by Wave with the agent confirming he saw the Wave confirmation. The member is then `CARD_TO_ASSIGN`. **Associating the card is a separate step, done only by scanning the QR code printed on a blank card** (no typed number); the member then becomes `ACTIVE`. If the scan cannot be done right away, the member stays `CARD_TO_ASSIGN` and the agent associates the card later. If the merchant does not pay, nothing is sent to the server. No manual validation.

#### `GET /agent/today` — access: collect.field

```json
{
  "businessDate": "2026-11-10",
  "cutoffTime": "16:00",
  "collected": 48500,
  "deposits": 37,
  "enrolled": 3,
  "toRemit": 48500,
  "lateMembers": 2,
  "cardsToAssign": 1
}
```

`collected`/`deposits`: the agent's confirmed payments of the business day (savings and membership fees); `toRemit`: **cash** collected (including membership fees paid in cash) minus remittances received by the cashier; `lateMembers`: own merchants with a loan in `LATE_1`/`LATE_2`; `cardsToAssign`: own members registered (paid) without a card.

#### `POST /members/phone-check` — access: member.enroll

Body `{ "phone": "0700000000" }` — POST so the phone number never appears in a URL (server logs, proxies, browser history). → `{ "available": true }` or `{ "available": false, "existingName": "K*** D***" }` (name always masked).

#### `POST /uploads` — access: any user

Multipart `file`. Response `201 { "url": "…" }` — the reference to send in `idDocUrl` / `photoUrl`.

#### `POST /members` — access: member.enroll

Registers the merchant and the 1 000 F payment **in one atomic operation** (all or nothing).

Header **`Idempotency-Key: <uuid>`** (one per registration, reused on every retry): if the same agent sends the same key again, the server returns the first `201` response unchanged and creates nothing (a lost response followed by a retry must not end in `PHONE_ALREADY_USED`). Keys are scoped to the agent.

```json
{
  "fullName": "Mariam Traoré",
  "phone": "07 12 34 56 78",
  "market": "Adjamé",
  "trade": "Vente de pagnes",
  "idNumber": "CI 1234 5678",
  "stall": "Allée B, étal 12",
  "idDocUrl": "…",
  "photoUrl": "…",
  "paymentChannel": "CASH",
  "paymentConfirmed": true,
  "paymentRef": "TX-998877"
}
```

- `paymentChannel`: `CASH` or `WAVE`; `paymentConfirmed` must be `true` (the agent received the cash / saw the Wave confirmation); `paymentRef`: optional Wave transaction reference, used later in reconciliation with the Wave statement.

`201` → `{ "member": { "status": "CARD_TO_ASSIGN", "accountNumber": "CPT-000121", "agentId": "u-ag1", … }, "payment": { "amount": 1000, "channel": "CASH", "status": "CONFIRMED", "agentId": "u-ag1", … } }`

Business day: `payment.businessDate` and the ledger entry's `businessDate` (`YYYY-MM-DD`, Abidjan) are today before the cash cut-off (`settings.cashCutoffTime`, 16:00) and **the next day (J+1) from the cut-off on**; the registration itself is never refused for that reason.

Side effects: ledger entry (debit `571` Caisse or `5215` Wave / credit `7061` Frais d'adhésion), audit `ENROLL_MEMBER`. The amount comes from the `MEMBERSHIP` payment type (1 000 F by default, editable in admin). A cash fee is part of what the agent hands to the cashier.

| Error | Code                    | When                                                                                                                                                            |
| ----- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 422   | `ENROLLMENT_INCOMPLETE` | missing/invalid field — `details` lists them (`fullName`, `phone`, `market`, `trade`, `idNumber`, `idDocUrl`, `photoUrl`, `paymentChannel`, `paymentConfirmed`) |
| 409   | `PHONE_ALREADY_USED`    | the phone belongs to another merchant                                                                                                                           |

Phone: 10 digits starting with 01, 05 or 07 (`+225` prefix accepted), stored as `07 12 34 56 78`.

#### `POST /cards/lookup` — access: card.assign, cards.manage

Body `{ "qrToken": "<scanned token>" }` — POST so the card's secret token never appears in a URL. → `{ "card": { "id", "printedNumber", "status" } }` — lets the agent check the scanned card is blank (`UNASSIGNED`) before associating it. 404 `CARD_NOT_FOUND` when the QR is not a WASSIA card. (Back-office card management may also look up by `{ "number": "WAS-000124" }`.)

#### `POST /cards/assign` — access: card.assign

Body `{ "memberId": "…", "qrToken": "<scanned token>" }` — **QR token only**, a typed card number is refused. → `200 { member, card }`, both `ACTIVE`. Side effects: SMS `ENROLLMENT` (« compte actif, carte prête »), audit `ASSIGN_CARD`.

| Error | Code                                  | When                                        |
| ----- | ------------------------------------- | ------------------------------------------- |
| 422   | `QR_REQUIRED`                         | no `qrToken` (e.g. a typed number was sent) |
| 403   | `NOT_YOUR_MERCHANT`                   | the merchant belongs to another agent       |
| 404   | `MEMBER_NOT_FOUND` / `CARD_NOT_FOUND` | unknown merchant / QR is not a WASSIA card  |
| 409   | `INVALID_STATUS`                      | the merchant already has a card             |
| 409   | `CARD_ALREADY_USED`                   | the card is not blank                       |

Other write endpoints (payment page, collection, cash closure, loans…) are added in the following phases.
