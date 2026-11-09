import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  useMock: true,
  apiBaseUrl: '/api/v1',
  oidc: {
    authority: '',
    clientId: 'wassia-web',
    redirectUri: '/auth/callback',
  },
};
