import { differenceInCalendarDays } from 'date-fns';

// Single source of truth for "how far before expiry do we care" — consumed by
// the dashboard/item-detail displays and the expiry-notification cron alike.
// See docs/ARCHITECTURE.md's "Expiration notification (warranty + AMC)".
export const EXPIRY_THRESHOLDS_DAYS = [30, 7, 1] as const;

export interface ExpiryStatus {
  daysUntil: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

export function getExpiryStatus(date: Date | null, referenceDate: Date = new Date()): ExpiryStatus {
  if (!date) return { daysUntil: null, isExpired: false, isExpiringSoon: false };

  const daysUntil = differenceInCalendarDays(date, referenceDate);
  return {
    daysUntil,
    isExpired: daysUntil < 0,
    isExpiringSoon: daysUntil >= 0 && daysUntil <= Math.max(...EXPIRY_THRESHOLDS_DAYS),
  };
}

// Which configured thresholds (30/7/1) a source has newly crossed as of today
// and hasn't already been logged for — used by the cron to decide what to
// notify. `<=` rather than `===` means a missed cron run doesn't permanently
// skip a threshold; worst case two thresholds fire together in one digest.
export function crossedThresholdsToday(daysUntil: number, alreadyLogged: Set<number>): number[] {
  return EXPIRY_THRESHOLDS_DAYS.filter((t) => daysUntil <= t && daysUntil >= 0 && !alreadyLogged.has(t));
}
