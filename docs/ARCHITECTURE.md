# Architecture — WASSIA front-end

One responsive Angular 22 PWA for everyone (decision of 2026-11-09):

- **Back office** `/app/...` — DG, Directeur adjoint, Chef d'agence, Gestionnaire, Comptable, Caissière. Fixed navy side menu from 1024 px, drawer below.
- **Agent** `/agent/...` — field agents on phone (bottom tab bar) and tablet (left rail).
- **Public QR page** `/pay/:token` — no login, member name masked.
- **Dev only** `/dev/styleguide` — every `shared/ui` component and state, plus a role switcher. Not bundled in production (`ngDevMode` check in `app.routes.ts`).

## Layers

| Folder                                           | Role                                                                                                           | May import       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ---------------- |
| `core/config`                                    | Single sources of truth: permission matrix, workflow transition tables, loan grid, navigation, settings, flags | `core/models`    |
| `core/models`                                    | Shared TypeScript types                                                                                        | —                |
| `core/auth`                                      | `SessionStore` (current user in memory), `permissionGuard`, `homeRedirect`                                     | `core/config`    |
| `core/layout`                                    | `BackofficeShell`, `AgentShell`, brand, IOB notice, offline banner                                             | `core`, `shared` |
| `shared/ui`, `shared/pipes`, `shared/directives` | Presentational building blocks (`*appCan`, `fcfa`, `abidjanDate`, `maskName`)                                  | `core`           |
| `features/*`                                     | Lazy-loaded screens; never import another feature                                                              | `core`, `shared` |
| `mocks/`                                         | Fake back end (Phase 1); removable without touching anything else                                              | everything       |

ESLint forbids importing `mocks/` from anywhere except `mocks/` and `app.config.ts`.

## Rules encoded in config, never in components

- Who can do what: `permissions.config.ts` → read by guards, `*appCan`, menus.
- Status changes: `workflow.config.ts` tables (from, to, actor, reason required). `SYSTEM` transitions are never buttons.
- Loan maths and approval tiers: `loan.config.ts` (integer FCFA arithmetic only).

## Dependencies

| Package                                                   | Why                                                                | Size impact                |
| --------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------- |
| `tailwindcss` 4, `@tailwindcss/postcss`, `tw-animate-css` | Styling, tokens in `@theme` (`src/styles.css`)                     | build-time; ~27 kB CSS     |
| `@angular/cdk`                                            | Dialog, focus trap, overlay                                        | only what is imported      |
| `@spartan-ng/brain`                                       | Accessible unstyled primitives (installed, used from later phases) | not bundled until imported |
| `class-variance-authority`, `clsx`, `tailwind-merge`      | Component variants                                                 | ~10 kB                     |
| `@ng-icons/core`, `@ng-icons/lucide`                      | Icons (`lucide-angular` does not support Angular 22)               | per icon, tree-shaken      |
| `ngx-sonner`                                              | Toasts with `aria-live`                                            | ~15 kB                     |
| `date-fns`                                                | Date maths (16:00 cut-off, J+1)                                    | tree-shaken                |
| `@fontsource/poppins`, `@fontsource/open-sans`            | Self-hosted fonts (offline PWA, strict CSP)                        | latin subsets only         |
| `@angular/service-worker`                                 | PWA install + offline shell                                        | —                          |
| `angular-eslint`, `husky`, `lint-staged`, `prettier`      | Quality gate on commit                                             | dev only                   |
| `@playwright/test`                                        | E2E and responsive screenshots                                     | dev only                   |

Initial bundle after Phase 0: **365 kB raw / 95 kB transferred** (budget 600 kB warning, 1 MB error).

## Security notes

- Access token in memory only; role and permissions always come from `GET /me`.
- No personal data or amounts in URLs, logs or QR codes (QR = opaque token).
- Planned CSP (to set on the web server): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' <api> <keycloak>; frame-ancestors 'none'; base-uri 'self'`. Fonts are self-hosted so no third-party origin is needed.
