# Architecture — WASSIA front-end

One responsive Angular 22 PWA for everyone (decision of 2026-11-09):

- **Back office** `/app/...` — DG, Directeur adjoint, Chef d'agence, Gestionnaire, Comptable, Caissière. Fixed navy side menu from 1024 px, drawer below.
- **Agent** `/agent/...` — field agents on phone (bottom tab bar) and tablet (left rail).
- **Public QR page** `/pay/:token` — no login, member name masked.
- **Dev only** `/dev/styleguide` — every `shared/components` component and state, plus a role switcher. Not bundled in production (`ngDevMode` check in `app.routes.ts`).

## Layers

| Folder       | Role                                                                                                                                                               | May import                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| `core/`      | Singletons, no visual component: `api/`, `auth/` (session, guards), `interceptors/`, `services/` (toast, clock, network), `config/`, `domain/`, `i18n/`, `models/` | `core` only                |
| `shared/`    | Generic building blocks, no business rule: `components/`, `directives/`, `pipes/`, `services/` (confirm), `utils/`                                                 | `core`                     |
| `layout/`    | `AgentShell`, `BackofficeShell`, IOB notice, offline banner, `AgentHeader` (top-bar state set by agent screens)                                                    | `core`, `shared`           |
| `features/*` | Lazy-loaded screens; never import another feature                                                                                                                  | `core`, `shared`, `layout` |
| `mocks/`     | Fake back end; removable without touching anything else; only `app.config.ts` imports it                                                                           | everything                 |

These rules are enforced by `no-restricted-imports` in `eslint.config.js`. Cross-area imports use the aliases `@core/*`, `@shared/*`, `@layout/*`, `@features/*`, `@env/*` (`tsconfig.json`); `../../../` is forbidden, relative imports stay for files of the same area.

Pure business rules shared by the screens and the fake server live in `core/domain` (enrollment validation, membership fee, 16:00 cut-off countdown) and pure formatters in `core/i18n/format` (FCFA, Abidjan dates, masked names, "il y a…"); pipes in `shared/pipes` only wrap them.

### File naming

- Component: folder `<name>/` with `<name>.component.ts` + `<name>.component.html` (+ `.component.spec.ts`). No inline `template:` / `styles:` (only test host components inside `*.spec.ts`), no style file (Tailwind classes only).
- Other suffixes: `.service.ts`, `.store.ts`, `.guard.ts`, `.interceptor.ts`, `.pipe.ts`, `.directive.ts`, `.model.ts`, `.routes.ts`. Class names and selectors keep the short form (`EnrollPage`, `app-enroll-page`).

### Inside a feature (see `features/agent`)

| Sub-folder           | Contains                                                                                                                                        | Rule                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `pages/<page>/`      | Routed component + its page-scoped `*.store.ts` (signals + RxJS) and helpers used only by it (e.g. `enroll-steps.ts`, `enroll-error.mapper.ts`) | Store provided by the page, so state dies with it; no `subscribe()`, HTTP or business rule in the component |
| `components/`        | Presentational components: `input()` / `output()` only, no service                                                                              | Never import from `pages/`                                                                                  |
| `services/`          | Typed HTTP API of the feature (`agent-api.service.ts`)                                                                                          | Only path to `ApiClient`                                                                                    |
| `models/`            | Types and form factories shared by the feature's pages and components (`enrollment-form.model.ts`)                                              | No Angular service                                                                                          |
| `<feature>.store.ts` | Only when state is shared between several pages of the feature                                                                                  | —                                                                                                           |

Async actions in stores: `switchMap` for look-ups (only the latest answer counts), `exhaustMap` for submissions (double taps ignored), always `takeUntilDestroyed`.

`core/auth/auth.mock.ts` (demo login) lives in core but never imports `mocks/`.

### Deviations from the generic reviewer guide (`wassia-code-reviewer.md`)

| Guide                                          | Here                                                               | Why                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `.component.scss` for every component          | No style file                                                      | Tailwind CSS-first with design tokens (CLAUDE.md §3)                         |
| Business models inside each feature            | API types in `core/models`, shared rules in `core/domain`          | They are the API contract, used by several features and by the fake back end |
| `Page<T>`, `ApiError` in `shared/models`       | `core/api/pagination.ts`, `core/api/error.model.ts`                | Used by `core` (API client, interceptors), and `core` imports nothing else   |
| JWT + `token.service.ts` + refresh interceptor | OIDC (Keycloak, code + PKCE) behind `AuthService`; token in memory | CLAUDE.md §3 and §11                                                         |

## Fake back end (development only)

- `mocks/index.ts` provides the mock interceptor, `MockDb`, `MockControl`, `MockAuthService` and mounts the dev panel. In production it is swapped for `mocks/index.prod.ts` (empty) via `fileReplacements`, so no mock code ships.
- Interceptor order: `authInterceptor` → `errorInterceptor` → `mockBackendInterceptor` (last, acts as the server).
- Data: `mocks/seed/seed.ts` (seeded PRNG, reproducible), persisted in localStorage under `wassia.mock.db.v<MOCK_DATA_VERSION>`. Bump `MOCK_DATA_VERSION` when the shape changes.
- Routes: `mocks/handlers/index.ts` — one entry per endpoint with its required permissions, mirroring docs/API_CONTRACT.md.
- To switch to the real back end: `useMock: false` + `apiBaseUrl`, then wire Keycloak in `core/auth/auth.oidc.ts`.

## Rules encoded in config, never in components

- Who can do what: `permissions.config.ts` → read by guards, `*appCan`, menus.
- Status changes: `workflow.config.ts` tables (from, to, actor, reason required). `SYSTEM` transitions are never buttons.
- Loan maths and approval tiers: `loan.config.ts` (integer FCFA arithmetic only).

## Dependencies

| Package                                                   | Why                                                                             | Size impact                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `tailwindcss` 4, `@tailwindcss/postcss`, `tw-animate-css` | Styling, tokens in `@theme` (`src/styles.css`)                                  | build-time; ~27 kB CSS                                  |
| `@angular/cdk`                                            | Dialog, focus trap, overlay                                                     | only what is imported                                   |
| `@spartan-ng/brain`                                       | Accessible unstyled primitives (installed, used from later phases)              | not bundled until imported                              |
| `class-variance-authority`, `clsx`, `tailwind-merge`      | Component variants                                                              | ~10 kB                                                  |
| `@ng-icons/core`, `@ng-icons/lucide`                      | Icons (`lucide-angular` does not support Angular 22)                            | per icon, tree-shaken                                   |
| `ngx-sonner`                                              | Toasts with `aria-live`                                                         | ~15 kB                                                  |
| `date-fns`                                                | Date maths (16:00 cut-off, J+1)                                                 | tree-shaken                                             |
| `@fontsource/poppins`, `@fontsource/open-sans`            | Self-hosted fonts (offline PWA, strict CSP)                                     | latin subsets only                                      |
| `@angular/service-worker`                                 | PWA install + offline shell                                                     | —                                                       |
| `angular-eslint`, `husky`, `lint-staged`, `prettier`      | Quality gate on commit                                                          | dev only                                                |
| `@playwright/test`                                        | E2E and responsive screenshots                                                  | dev only                                                |
| `jsqr`                                                    | Lecture du QR des cartes quand le navigateur n'a pas de lecteur natif (iPhone…) | ~130 kB brut, chargé seulement à l'ouverture du scanner |

Initial bundle after Phase 0: **365 kB raw / 95 kB transferred** (budget 600 kB warning, 1 MB error).

## Security notes

- Access token in memory only; role and permissions always come from `GET /me`.
- No personal data or amounts in URLs, logs or QR codes (QR = opaque token).
- Planned CSP (to set on the web server): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' <api> <keycloak>; frame-ancestors 'none'; base-uri 'self'`. Fonts are self-hosted so no third-party origin is needed.
