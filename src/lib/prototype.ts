import { useSyncExternalStore } from 'react';

/**
 * Prototype switch: a day doesn't end at midnight but at 4am, so a 01:30
 * entry or log still belongs to the evening before and nothing needs
 * correcting. Toggled from the journal's ⋯ menu. Promote to a real setting
 * or delete once decided.
 */

export const LATE_NIGHT_BOUNDARY_HOUR = 4;

const BOUNDARY_KEY = 'almond-proto-day-boundary';
const EVENT = 'almond-proto-change';

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

export function lateNightBoundaryOn(): boolean {
  try {
    return localStorage.getItem(BOUNDARY_KEY) === 'on';
  } catch {
    return false;
  }
}

export function setLateNightBoundary(on: boolean) {
  localStorage.setItem(BOUNDARY_KEY, on ? 'on' : 'off');
  window.dispatchEvent(new Event(EVENT));
}

export function useLateNightBoundary(): boolean {
  return useSyncExternalStore(subscribe, lateNightBoundaryOn, () => false);
}

/** How many hours past midnight the calendar day keeps going. */
export function dayStartsAtHour(): number {
  return lateNightBoundaryOn() ? LATE_NIGHT_BOUNDARY_HOUR : 0;
}
