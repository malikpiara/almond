import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { applyPairingKey, sync } from '@/lib/drive';

/**
 * Pairing receiver. A new device reaches `/link#k=<key>` by scanning the QR
 * shown on an already-connected device. The key lives in the URL fragment, so
 * it never hits any server; we read it client-side, strip it from history, then
 * connect + sync.
 */
export function LinkDevice() {
  const navigate = useNavigate();
  // Capture the key at first render — before the effect strips the hash — so a
  // StrictMode/double re-invocation still has it.
  const [key] = useState(() =>
    new URLSearchParams(location.hash.replace(/^#/, '')).get('k')
  );
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // run exactly once
    ran.current = true;

    // Remove the key from the URL + history before doing anything else.
    history.replaceState(null, '', location.pathname);

    if (!key) {
      navigate({ to: '/journals', replace: true });
      return;
    }

    (async () => {
      applyPairingKey(key);
      const result = await sync(true);
      if (result.ok) {
        navigate({ to: '/', replace: true });
      } else {
        setError(
          result.reason === 'auth'
            ? 'Google sign-in was cancelled. Open the link again to retry.'
            : 'Could not link this device. Open the link again to retry.'
        );
      }
    })();
  }, [key, navigate]);

  return (
    <div className='max-w-md m-auto flex flex-col min-h-screen items-center justify-center gap-4 px-8 text-center'>
      <h1 className='text-2xl font-medium text-gray-800'>
        {error ? 'Linking failed' : 'Linking this device…'}
      </h1>
      {error ? (
        <>
          <p className='text-gray-500'>{error}</p>
          <Link to='/journals'>
            <Button>Go to your journals</Button>
          </Link>
        </>
      ) : (
        <p className='text-gray-500'>Connecting to Google Drive…</p>
      )}
    </div>
  );
}
