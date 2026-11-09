/** Shape of every environment file. Public values only — never a secret. */
export interface Environment {
  production: boolean;
  /** `true` ⇒ the in-memory mock back end answers `/api/v1/...`. */
  useMock: boolean;
  apiBaseUrl: string;
  oidc: {
    authority: string;
    clientId: string;
    redirectUri: string;
  };
}
