import { HttpInterceptorFn } from '@angular/common/http';
import { EnvironmentProviders, Provider } from '@angular/core';

/** Production replacement for `mocks/index.ts`: no fake back end, no dev panel. */
export const MOCK_INTERCEPTORS: HttpInterceptorFn[] = [];
export const MOCK_PROVIDERS: (Provider | EnvironmentProviders)[] = [];
