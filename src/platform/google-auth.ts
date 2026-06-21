import { registerPlugin } from '@capacitor/core';

/**
 * Bridge to the native GoogleAuth plugin (Android `AuthorizationClient`).
 * Returns a Drive appData access token — silently when the grant exists, or via
 * a one-time consent dialog when interactive. See android/.../GoogleAuthPlugin.java.
 * Only meaningful on native; on web it's unused (drive.ts keeps the GIS flow).
 */
export interface GoogleAuthPlugin {
  getToken(options: { interactive: boolean }): Promise<{ accessToken: string }>;
}

export const GoogleAuth = registerPlugin<GoogleAuthPlugin>('GoogleAuth');
