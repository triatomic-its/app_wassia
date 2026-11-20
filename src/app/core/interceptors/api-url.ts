import { environment } from '@env/environment';

/** True for calls to the "Registre Wassia" back end. */
export const isRegistreUrl = (url: string): boolean =>
  environment.registreBaseUrl.length > 0 && url.startsWith(environment.registreBaseUrl);

/** True for calls to our own API (never add the token or toasts to third-party requests). */
export const isApiUrl = (url: string): boolean =>
  url.startsWith(environment.apiBaseUrl) || isRegistreUrl(url);
