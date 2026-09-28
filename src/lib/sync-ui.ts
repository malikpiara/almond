import { createContext, useContext } from 'react';
import type { SyncResult } from '@/lib/drive';

/**
 * Lets any screen open the app-global Sync modal, which is owned by the root
 * layout. Used so the mobile board can offer Sync from its ⋯ menu (where the
 * floating Sync button is hidden to avoid colliding with the composer).
 */
export const SyncUIContext = createContext<(() => void) | null>(null);

export function useOpenSync() {
  return useContext(SyncUIContext);
}

/** User-facing copy for each way a sync can fail. */
export const SYNC_FAILURE: Record<NonNullable<SyncResult['reason']>, string> = {
  'not-configured': 'Sync isn’t set up in this build yet.',
  'no-passphrase': 'No sync key on this device yet.',
  auth: 'Google sign-in was cancelled or failed.',
  'bad-passphrase':
    'This device’s key doesn’t match the journal in your Drive.',
  'needs-pairing':
    'This Google account already has an Almond journal — link this device instead (below).',
  'forward-compat':
    'Your Drive copy was written by a newer Almond — please update Almond.',
  error: 'Sync failed. Check your connection and try again.',
};
