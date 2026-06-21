# Almond — Native app (Android, Capacitor)

> Companion to [README.md](README.md) / [PRODUCT.md](PRODUCT.md): why Almond went
> native, how it's built, and how to run/deploy it. Born from a spike testing
> whether a **daily reminder raises reflection frequency** (the north-star).

## Why native

The web PWA hits two ceilings that matter for retention:

- **Silent background sync is impossible on the web.** Google's GIS token flow
  needs a **user-gesture popup**, so it can't refresh a Drive token on app
  open/focus. Native uses the OS **authorization broker** (`AuthorizationClient`)
  which mints a `drive.appdata` token *silently* after a one-time consent.
- **Reliable scheduled reminders.** Native local notifications are dependable;
  PWA notifications (especially iOS) are not. The reminder is the habit
  **trigger** — the spike's whole hypothesis.

Capacitor wraps the existing Vite/React build in a WebView shell, so ~all the web
code runs unchanged; only native capabilities are added, behind seams. (Same
WebView ⇒ the transition-smoothness ceiling stays — a future React Native move is
the lever for that, and the `platform/` seams are what keep it cheap.)

## Build & run (Android)

Prereqs: **Android Studio** (bundles the SDK + JDK 21), a device with **USB
debugging**, and an **Android OAuth client** (package `com.moonwith.almond` + your
debug SHA-1, `drive.appdata` scope) in the same Google Cloud project as the web
client.

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

pnpm build                                      # web build → dist/
pnpm exec cap sync android                      # copy web assets + plugins into android/
pnpm exec cap run android --target <deviceId>   # build APK + install + launch
```

Debug cert fingerprints (for the OAuth client and `assetlinks.json`):

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android
```

App icon (regenerate after changing the mark):

```bash
node scripts/gen-app-icon.mjs && npx capacitor-assets generate --android
```

## Architecture — the platform seams

`src/platform/` is the boundary; web and native each supply an implementation,
chosen at runtime by `isNative()`. This is what keeps the web build untouched and
a future React Native port cheap (only these adapters change):

- **`auth.ts`** (contract) + native **`GoogleAuthPlugin.java`** — Android
  `AuthorizationClient` → silent `drive.appdata` token. `drive.ts` `getToken`
  branches on `isNative()`; the web keeps the GIS flow.
- **`notifications.ts`** — the daily reminder, on a high-importance channel so it
  banners (heads-up). Web is a no-op.
- Persistence keeps the existing **store seam**; `crypto.ts` (Web Crypto) runs
  unchanged inside the WebView.

Native-only UI lives in **`/settings`** (weekly reflection stat, reminder,
pairing, debug), reached by a discreet gear on the Journals screen. Everything
native is gated by `isNative()`, so the web/desktop app is unchanged.

## Pairing (load your journal onto a device)

Sync is E2E, so a new device needs the **key**. Two paths:

- **App Link / QR (preferred):** scanning the “Link a device” QR opens the app at
  `/link#k=…`; `useDeepLink` (`@capacitor/app`) applies the key and pulls the
  journal. Requires `public/.well-known/assetlinks.json` **live on the domain**
  (the app's signing SHA-256) + the `autoVerify` intent-filter in the manifest.
  **Uninstall the PWA** so it doesn't also claim `…/link`.
- **Paste link (fallback):** `PairLink` in Settings — paste the copied link.
  Temporary; kept while App Link verification settles on sideloaded builds.

## Back / navigation

`useAndroidBack` (`@capacitor/app`): the back **button and edge-swipe** both go to
**Journals** from any sub-screen, and **minimize** from Journals. Registered once
on the stable router — `useNavigate` returns a fresh ref each render, and
depending on it churns the listener so Capacitor's default exit wins.

## Service worker

Registered **web-only** (`!isNative()` in `main.tsx`, `injectRegister: false`).
The WebView serves assets itself, so a SW there only reintroduces the
stale-cache class of bugs.

## Gotchas & follow-ups

- **Capacitor 8:** the legacy `handleOnActivityResult` doesn't fire — the consent
  PendingIntent uses an AndroidX `ActivityResultLauncher`.
- **pnpm + Capacitor:** `android/capacitor.settings.gradle` hardcodes
  `.pnpm/…` plugin paths (env-specific). Run `cap sync` after install on a fresh
  clone / CI to regenerate them.
- **Before a real release:** remove the TEMP `PairLink` and the "Send test
  notification" debug control; add the **Play signing** SHA-1/-256 to the OAuth
  client and `assetlinks.json` (the debug cert is sideload-only).
- `android/` is committed; build artifacts are excluded by Capacitor's
  `android/.gitignore`.
