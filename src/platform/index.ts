import { Capacitor } from '@capacitor/core';

/**
 * The platform seam. Every native capability (notifications, auth, …) lives
 * behind an interface here, with a web implementation and a native one chosen
 * at runtime. This is what keeps the codebase portable: the same web build runs
 * in the browser and inside the Capacitor WebView, and a future React Native
 * move only reimplements these adapters — the consumers never change.
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}
