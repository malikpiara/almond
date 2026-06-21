/**
 * Drive auth seam — the boundary that fixes the popup problem.
 *
 * WEB: Google Identity Services' implicit token flow. Acquiring a token opens a
 * popup, and browsers only allow popups from a user gesture — so it can't run
 * silently on app open / focus. This is the limitation that motivated going
 * native. (Today this flow still lives inline in `drive.ts`.)
 *
 * NATIVE (Android): a thin Capacitor plugin around Google Identity Services'
 * `AuthorizationClient.authorize()`, which returns a `drive.appdata` access
 * token — silently when the grant already exists, with a one-time OS consent
 * dialog the first time. No popup, no gesture requirement. That's the unlock.
 *
 * PHASE 2 (when the SDK + Android OAuth client exist): move the GIS flow out of
 * `drive.ts` into a web `DriveAuthProvider`, add the native provider, and route
 * `drive.ts` through `getDriveAuth().getToken()`. Then both platforms share one
 * code path and React Native later only swaps this adapter.
 */
export interface DriveAuthProvider {
  /**
   * Acquire a Google Drive access token (scope: drive.appdata).
   * @param interactive whether UI (consent / account picker) may be shown.
   */
  getToken(interactive: boolean): Promise<string>;
  /** Forget any cached token / sign out. */
  signOut(): void;
}

/** Drive's appData scope — the only scope Almond ever requests. */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
