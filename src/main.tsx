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
import { People } from './routes/people';
import { consumeAuthRedirect } from './lib/drive';

// Back from Google's sign-in on /auth#access_token=…: take the token and
// restore the user's URL before the router ever sees it.
consumeAuthRedirect();

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

const peopleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/people',
  component: People,
});

const linkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/link',
  component: LinkDevice,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  journalsRoute,
  boardRoute,
  peopleRoute,
  linkRoute,
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
