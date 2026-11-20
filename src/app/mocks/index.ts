import { HttpInterceptorFn } from '@angular/common/http';
import {
  ApplicationRef,
  EnvironmentInjector,
  EnvironmentProviders,
  Provider,
  createComponent,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { environment } from '@env/environment';
import { MockAuthService } from '@core/auth/auth.mock';
import { AuthService } from '@core/auth/auth.service';
import { SIMULATED_QR_SCANS } from '@shared/components/card-scan/card-scan.component';
import { MockControl } from './control';
import { MockDb } from './db';
import { DevPanel } from './dev-panel/dev-panel.component';
import { mockBackendInterceptor } from './mock-backend.interceptor';
import { registreBridgeInterceptor } from './registre-bridge.interceptor';
import { MockScanner } from './scanner';

/**
 * Entry point of the fake back end. In production builds this file is replaced by
 * `index.prod.ts` (angular.json fileReplacements), so nothing from mocks/ is bundled.
 */
export const MOCK_INTERCEPTORS: HttpInterceptorFn[] = environment.useMock
  ? environment.useRegistre
    ? [registreBridgeInterceptor, mockBackendInterceptor]
    : [mockBackendInterceptor]
  : [];

export const MOCK_PROVIDERS: (Provider | EnvironmentProviders)[] = environment.useMock
  ? [
      MockDb,
      MockControl,
      MockScanner,
      { provide: SIMULATED_QR_SCANS, useFactory: () => inject(MockScanner).scans$ },
      // With the registry, login goes through RegistreAuthService (app.config.ts).
      ...(environment.useRegistre ? [] : [{ provide: AuthService, useClass: MockAuthService }]),
      provideAppInitializer(() => {
        // Restore the clock offset before anything reads "now".
        inject(MockControl);
        if (typeof document === 'undefined' || environment.production) return;
        const appRef = inject(ApplicationRef);
        const host = document.createElement('app-dev-panel');
        document.body.appendChild(host);
        const ref = createComponent(DevPanel, {
          environmentInjector: inject(EnvironmentInjector),
          hostElement: host,
        });
        appRef.attachView(ref.hostView);
      }),
    ]
  : [];
