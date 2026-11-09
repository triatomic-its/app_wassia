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
import { environment } from '../../environments/environment';
import { MockAuthService } from '../core/auth/auth.mock';
import { AuthService } from '../core/auth/auth.service';
import { MockControl } from './control';
import { MockDb } from './db';
import { DevPanel } from './dev-panel/dev-panel';
import { mockBackendInterceptor } from './mock-backend.interceptor';

/**
 * Entry point of the fake back end. In production builds this file is replaced by
 * `index.prod.ts` (angular.json fileReplacements), so nothing from mocks/ is bundled.
 */
export const MOCK_INTERCEPTORS: HttpInterceptorFn[] = environment.useMock
  ? [mockBackendInterceptor]
  : [];

export const MOCK_PROVIDERS: (Provider | EnvironmentProviders)[] = environment.useMock
  ? [
      MockDb,
      MockControl,
      { provide: AuthService, useClass: MockAuthService },
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
