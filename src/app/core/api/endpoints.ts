/** API paths, relative to `environment.apiBaseUrl` (`/api/v1`). Documented in docs/API_CONTRACT.md. */
export const API = {
  me: '/me',
  users: '/users',
  roles: '/roles',
  settings: '/settings',
  paymentTypes: '/payment-types',
  members: '/members',
  member: (id: string) => `/members/${encodeURIComponent(id)}`,
  cards: '/cards',
  payments: '/payments',
  loans: '/loans',
} as const;
