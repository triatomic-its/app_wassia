import { PhoneCheck } from '@core/models';

/** Live check of the phone number typed on step 1 (duplicates are refused). */
export type PhoneCheckState =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'free' }
  | { state: 'taken'; name: string }
  /** The check failed (not just offline): told to the agent; the server checks again anyway. */
  | { state: 'error'; message: string };

export const PHONE_CHECK_IDLE: PhoneCheckState = { state: 'idle' };
export const PHONE_CHECK_PENDING: PhoneCheckState = { state: 'checking' };

export const PHONE_TAKEN_MESSAGE = 'Ce numéro est déjà enregistré pour un autre marchand.';

export function toPhoneCheckState(result: PhoneCheck): PhoneCheckState {
  return result.available ? { state: 'free' } : { state: 'taken', name: result.existingName ?? '' };
}
