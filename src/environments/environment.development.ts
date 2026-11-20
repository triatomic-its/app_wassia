import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  useMock: true,
  apiBaseUrl: '/api/v1',
  // Proxied to http://127.0.0.1:8080 by proxy.conf.json (avoids CORS).
  useRegistre: true,
  registreBaseUrl: '/registre',
  oidc: {
    authority: '',
    clientId: 'wassia-web',
    redirectUri: '/auth/callback',
  },
};
