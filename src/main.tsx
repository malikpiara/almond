import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
} from '@tanstack/react-router';
import '@fontsource-variable/geist';
import './globals.css';
import { RootLayout } from './routes/root';
import { Home } from './routes/home';
import { Board } from './routes/board';
import { IndexRedirect } from './routes/index-redirect';
import { LinkDevice } from './routes/link-device';
import { Settings } from './routes/settings';
import { isNative } from './platform';

// Register the PWA service worker on web only. Inside the Capacitor WebView the
// app is served natively, so a SW there adds nothing and reintroduces the
// stale-cache class of bugs. Manual registration (injectRegister:false) is what
// lets us make it conditional.
if (!isNative()) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexRedirect,
});

const journalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/journals',
  component: Home,
});

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/boards/$id',
  component: Board,
});

const linkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/link',
  component: LinkDevice,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  journalsRoute,
  boardRoute,
  linkRoute,
  settingsRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
