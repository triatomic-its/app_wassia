import { Environment } from './environment.model';

/** Production environment. Switch to the real back end by keeping `useMock: false`. */
export const environment: Environment = {
  production: true,
  useMock: false,
  apiBaseUrl: '/api/v1',
  oidc: {
    authority: '',
    clientId: 'wassia-web',
    redirectUri: '/auth/callback',
  },
};
