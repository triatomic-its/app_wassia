/** Shape of every environment file. Public values only — never a secret. */
export interface Environment {
  production: boolean;
  /** `true` ⇒ the in-memory mock back end answers `/api/v1/...`. */
  useMock: boolean;
  /** Base path of the routes still served by the mock back end (see docs/INTEGRATION_MAP.md). */
  apiBaseUrl: string;
  /**
   * `true` ⇒ the screens already wired to the real back end ("Registre Wassia") call it.
   * `false` ⇒ everything stays on the mock back end.
   */
  useRegistre: boolean;
  /** Base URL of the real back end (no trailing slash). `/registre` is proxied in development. */
  registreBaseUrl: string;
  oidc: {
    authority: string;
    clientId: string;
    redirectUri: string;
  };
}
