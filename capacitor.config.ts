import type { CapacitorConfig } from '@capacitor/cli';

// Native shell config (read by the Capacitor CLI, not bundled into the web app).
// webDir points at Vite's build output — `cap sync` copies dist/ into the native
// project. The app id is semi-permanent: it ties to the Play listing and the
// Android OAuth client, so changing it later means a new app + new credential.
const config: CapacitorConfig = {
  appId: 'com.moonwith.almond',
  appName: 'Almond',
  webDir: 'dist',
};

export default config;
