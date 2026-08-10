import { StagingBadge } from '@/components/StagingBadge';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { routeTree } from './routeTree.gen';
import { RouteProgress } from './components/ui/RouteProgress';
import './index.css';
import './styles/legacy-static.css';
import './styles/workspace-v2.css';
import { errorMessage, isAuthError } from './lib/apiError';
import { toast } from './lib/toast';

/**
 * Nothing fails quietly.
 *
 * These live on the caches rather than in defaultOptions so they fire for
 * every mutation and every query, including the ones that define their own
 * onError. A silent failure in an invoicing app means someone believes they
 * were paid when they were not.
 */
const mutationCache = new MutationCache({
  onError: (error, _vars, _ctx, mutation) => {
    // 401 is handled once, by the interceptor, so it does not stack up
    if (isAuthError(error)) return;
    const doing = mutation.meta?.doing as string | undefined;
    toast.error(errorMessage(error, doing));
  },
});

const queryCache = new QueryCache({
  onError: (error, query) => {
    if (isAuthError(error)) return;
    // A visible error state already explains a first load. This is for the
    // refetches behind it, which would otherwise leave stale figures on
    // screen with no hint that they stopped updating.
    if (query.state.data === undefined) return;
    const loading = query.meta?.loading as string | undefined;
    toast.error(errorMessage(error, loading ?? 'Refreshing'));
  },
});

const queryClient = new QueryClient({
  mutationCache,
  queryCache,
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Mock API (MSW). This is the demo's backend, so it runs in BOTH dev and
// production builds (Vercel/Netlify), opt out with VITE_USE_MOCKS=false to
// point the app at a real backend via VITE_API_URL.
async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCKS === 'false') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    // resolve the worker relative to the deploy root (works under any domain)
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}

// If the mock worker cannot start, the app still has to render. Without this
// catch the promise rejects, React never mounts, and the page is white with
// nothing in the console to explain it.
enableMocking()
  .catch((err) => {
    console.error('Mock API failed to start; continuing without it.', err);
  })
  .then(() => {
  const rootElement = document.getElementById('root')!;

  if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          {/* one line, every fetch: see components/ui/RouteProgress */}
          <RouteProgress />
          <StagingBadge />
          <RouterProvider router={router} />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </StrictMode>
    );
  }
});
