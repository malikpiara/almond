import { useEffect } from 'react';
import { toast } from 'sonner';
import { isConnected, sync } from '@/lib/drive';

// Passive triggers (focus/visibility/online) can fire in bursts as you flick
// between apps — throttle so we sync at most once per window from them.
const PASSIVE_THROTTLE_MS = 10_000;

/**
 * Keeps the open app current with changes made on other devices. Today's sync
 * only pushed after *your own* edits, so a second device showed stale data
 * until you wrote something. This pulls on the moments you'd expect freshness:
 * app open, tab focus/visibility, and network reconnect.
 *
 * Surfacing pulled data needs a refresh (the store isn't reactive yet), and a
 * hard reload would wipe an unsaved draft in the composer. So we split by risk:
 * on cold open there's no draft → reload silently; on focus/visibility/online a
 * draft may exist → show a non-destructive "Refresh" toast instead of yanking
 * the page.
 */
export function useDriveAutoSync(): void {
  useEffect(() => {
    let lastPassive = 0;
    let inFlight = false;
    let cancelled = false;

    const runSync = async (onChange: 'reload' | 'toast') => {
      if (cancelled || inFlight || !isConnected()) return;
      inFlight = true;
      try {
        const result = await sync(false);
        if (cancelled || !result.ok || !result.changed) return;
        if (onChange === 'reload') {
          window.location.reload();
        } else {
          toast('Synced new changes from another device', {
            id: 'auto-sync-changed', // dedupe repeat toasts
            duration: 8000,
            action: { label: 'Refresh', onClick: () => window.location.reload() },
          });
        }
      } catch {
        // Offline or a lapsed token — stay silent; the next trigger retries.
      } finally {
        inFlight = false;
      }
    };

    const passive = () => {
      const now = Date.now();
      if (now - lastPassive < PASSIVE_THROTTLE_MS) return;
      lastPassive = now;
      void runSync('toast');
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') passive();
    };

    // Initial pull on app open — safe to reload, no draft exists yet.
    void runSync('reload');

    window.addEventListener('focus', passive);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', passive);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', passive);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', passive);
    };
  }, []);
}
