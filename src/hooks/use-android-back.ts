import { useEffect, useRef } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { isNative } from '@/platform';

/**
 * Android hardware/gesture back. By default Capacitor exits when the WebView has
 * no history — and we deep-open to the last board, so back would quit the app
 * from inside a journal. Instead: from any sub-screen go to the Journals list;
 * from the list (the home), exit. Capacitor routes both the back button and the
 * edge-swipe gesture here, so the two stay consistent.
 *
 * Registered ONCE (deps on the stable router only) — `useNavigate` returns a new
 * ref each render, so depending on it re-runs the effect and the async
 * add/remove race can leave the listener unregistered (→ Capacitor's default
 * exit fires). We read the latest navigate via a ref instead.
 */
export function useAndroidBack(): void {
  const router = useRouter();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!isNative()) return;
    let handle: { remove: () => void } | undefined;
    let cancelled = false;

    import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', () => {
        const path = router.state.location.pathname;
        if (path === '/journals' || path === '/') {
          // Home screen: drop to the launcher but keep the app warm in recents.
          App.minimizeApp();
        } else {
          navigateRef.current({
            to: '/journals',
            viewTransition: { types: ['slide-back'] },
          });
        }
      }).then((h) => {
        if (cancelled) h.remove();
        else handle = h;
      });
    });

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, [router]);
}
