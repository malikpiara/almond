import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { isNative } from '@/platform';
import { applyPairingKey, sync, isConnected } from '@/lib/drive';

/**
 * Pairing via deep link. With the App Link verified (assetlinks.json), scanning
 * the "Link a device" QR opens the native app at /link#k=<key>; we apply the key
 * and pull the journal — the QR flow you'd expect, replacing the paste box.
 * Handles both a cold start (getLaunchUrl) and a warm open (appUrlOpen).
 */
export function useDeepLink(): void {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!isNative()) return;
    let handle: { remove: () => void } | undefined;
    let cancelled = false;

    const handleUrl = async (url: string | undefined) => {
      if (!url || !url.includes('/link')) return;
      const match = url.match(/[#&]k=([^&]+)/);
      if (!match) return;
      if (isConnected()) {
        navigateRef.current({ to: '/journals' });
        return;
      }
      applyPairingKey(decodeURIComponent(match[1]));
      const result = await sync(true);
      if (result.ok) {
        toast.success('Paired — loading your journal…');
        window.location.reload();
      } else {
        toast.error(`Pairing failed: ${result.reason ?? 'error'}`);
      }
    };

    import('@capacitor/app').then(({ App }) => {
      App.getLaunchUrl().then((r) => handleUrl(r?.url));
      App.addListener('appUrlOpen', (event) => handleUrl(event.url)).then((h) => {
        if (cancelled) h.remove();
        else handle = h;
      });
    });

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, []);
}
