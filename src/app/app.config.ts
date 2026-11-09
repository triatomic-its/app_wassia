import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { authInterceptor, errorInterceptor } from './core/api/interceptors';
import { OidcAuthService } from './core/auth/auth.oidc';
import { AuthService } from './core/auth/auth.service';
// Fake back end in development; replaced by an empty module in production builds.
import { MOCK_INTERCEPTORS, MOCK_PROVIDERS } from './mocks';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      withViewTransitions(),
    ),
    // Order matters: the mock interceptor must be last (closest to the "server").
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, errorInterceptor, ...MOCK_INTERCEPTORS]),
    ),
    { provide: AuthService, useClass: OidcAuthService },
    ...MOCK_PROVIDERS,
    // Restore the session (GET /me) before the first navigation.
    provideAppInitializer(() => inject(AuthService).restore()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
