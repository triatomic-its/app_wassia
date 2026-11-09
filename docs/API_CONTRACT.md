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

Write endpoints (enrollment, card association, collection, cash closure, loans…) are added in the following phases.
