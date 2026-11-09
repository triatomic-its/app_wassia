# API contract — WASSIA front-end ↔ back-end

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

| Endpoint              | Response                                                                        | Access   |
| --------------------- | ------------------------------------------------------------------------------- | -------- |
| `GET /users?role=&q=` | `Page<User>` (default sort `fullName,asc`)                                      | any user |
| `GET /settings`       | `{ cashCeiling, cashCutoffTime: "16:00", cashCountTime, paymentReminderHours }` | any user |
| `GET /payment-types`  | `PaymentType[]` — `{ id, code, label, defaultAmount?, fixedAmount, active }`    | any user |

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

Enrollment has **no manual validation**: as soon as the required information is complete and the phone is not already used, the account is created (`PAYMENT_PENDING`) and the merchant receives the payment SMS. Lifecycle: `PAYMENT_PENDING` → (1 000 F paid) → `CARD_TO_ASSIGN` → (agent associates a blank card) → `ACTIVE`.

#### `GET /agent/today` — access: collect.field

```json
{
  "businessDate": "2026-11-09",
  "cutoffTime": "16:00",
  "collected": 48500,
  "deposits": 37,
  "enrolled": 3,
  "toRemit": 48500,
  "lateMembers": 2,
  "paymentPending": 4,
  "cardsToAssign": 1
}
```

`collected`/`deposits`: the agent's confirmed collections of the business day; `toRemit`: cash collected minus remittances received by the cashier; `lateMembers`: own merchants with a loan in `LATE_1`/`LATE_2`.

#### `GET /members/phone-check?phone=0700000000` — access: member.enroll

`{ "available": true }` or `{ "available": false, "existingName": "K*** D***" }` (name always masked).

#### `POST /uploads` — access: any user

Multipart `file`. Response `201 { "url": "…" }` — the reference to send in `idDocUrl` / `photoUrl`.

#### `POST /members` — access: member.enroll

```json
{
  "fullName": "Mariam Traoré",
  "phone": "07 12 34 56 78",
  "market": "Adjamé",
  "trade": "Vente de pagnes",
  "idNumber": "CI 1234 5678",
  "stall": "Allée B, étal 12",
  "idDocUrl": "…",
  "photoUrl": "…"
}
```

`201` → the created `Member` (`status: PAYMENT_PENDING`, `accountNumber: CPT-000121`, `agentId` = caller). Side effects: SMS `PAYMENT_LINK`, audit `CREATE_ACCOUNT`.

| Error | Code                    | When                                                                                                                            |
| ----- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 422   | `ENROLLMENT_INCOMPLETE` | missing/invalid field — `details` lists the fields (`fullName`, `phone`, `market`, `trade`, `idNumber`, `idDocUrl`, `photoUrl`) |
| 409   | `PHONE_ALREADY_USED`    | the phone belongs to another merchant                                                                                           |

Phone: 10 digits starting with 01, 05 or 07 (`+225` prefix accepted), stored as `07 12 34 56 78`.

#### `GET /cards/lookup?qr=<token>` or `?number=WAS-000124` — access: card.assign, cards.manage

`{ "card": { "id", "printedNumber", "status" } }`; `number` also accepts the short form (`124`). 404 `CARD_NOT_FOUND`.

#### `POST /cards/assign` — access: card.assign

Body `{ "memberId": "…", "qrToken": "…" }` or `{ "memberId": "…", "number": "WAS-000124" }` → `200 { member, card }` with both `ACTIVE`. Side effects: SMS `ENROLLMENT`, audit `ASSIGN_CARD`.

| Error | Code                                  | When                                  |
| ----- | ------------------------------------- | ------------------------------------- |
| 403   | `NOT_YOUR_MERCHANT`                   | the merchant belongs to another agent |
| 404   | `MEMBER_NOT_FOUND` / `CARD_NOT_FOUND` | unknown merchant / card               |
| 409   | `PAYMENT_MISSING`                     | the 1 000 F have not been paid yet    |
| 409   | `INVALID_STATUS`                      | the merchant already has a card       |
| 409   | `CARD_ALREADY_USED`                   | the card is not blank                 |

Other write endpoints (payment page, collection, cash closure, loans…) are added in the following phases.
