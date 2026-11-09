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

Endpoints are documented here as they are implemented (Phase 1 onwards).
