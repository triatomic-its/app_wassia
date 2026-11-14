import { environment } from '@env/environment';

/** True for calls to our own API (never add the token or toasts to third-party requests). */
export const isApiUrl = (url: string): boolean => url.startsWith(environment.apiBaseUrl);
