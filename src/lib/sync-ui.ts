import { createContext, useContext } from 'react';

/**
 * Lets any screen open the app-global Sync modal, which is owned by the root
 * layout. Used so the mobile board can offer Sync from its ⋯ menu (where the
 * floating Sync button is hidden to avoid colliding with the composer).
 */
export const SyncUIContext = createContext<(() => void) | null>(null);

export function useOpenSync() {
  return useContext(SyncUIContext);
}
