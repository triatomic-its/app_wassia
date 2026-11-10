import { Settings } from '../models';

/** Default business settings, editable in admin (ASSUMPTION A5). */
export const DEFAULT_SETTINGS: Settings = {
  cashCeiling: 2_000_000,
  cashCutoffTime: '16:00',
  cashCountTime: '16:30',
};

export const BUSINESS_TIME_ZONE = 'Africa/Abidjan';
