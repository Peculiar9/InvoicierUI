import { StagingBadge } from '@/components/StagingBadge';

// pay.invoicier.app is the payment surface, nothing else. It shares this SPA,
// so a host guard keeps it to /pay and /receipt; every other path belongs on
// the app domain and is bounced there before the app even mounts (and before
// analytics fires below), so the pay domain never shows a dashboard or a
// marketing page.
if (window.location.hostname === 'pay.invoicier.app') {
  const path = window.location.pathname;
  const isPaySurface = path.startsWith('/pay/') || path.startsWith('/receipt/');
  if (!isPaySurface) {
    window.location.replace(
      'https://invoicier.app' + path + window.location.search + window.location.hash
    );
  }
}

// Cloudflare Web Analytics — exact-host gated to production, so staging
// (staging.invoicier.app, *.netlify.app) and localhost never pollute the
// numbers. Cookieless; route changes tracked via the History API (SPA mode).
if (['invoicier.app', 'www.invoicier.app'].includes(window.location.hostname)) {
  const beacon = document.createElement('script');
  beacon.defer = true;
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.setAttribute('data-cf-beacon', '{"token": "202fe458304441f3aa0db8490dcfe688"}');
  document.head.appendChild(beacon);
}
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

// Mock API (MSW). Opt-IN only: the demo backend runs solely when a build
// explicitly sets VITE_USE_MOCKS=true. Every other build — real deploys and a
// deploy that simply forgot the flag — talks to the real backend via
// VITE_API_URL, so a misconfigured environment can never silently serve fake
// data to users.
async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return;
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

  // the crawler-facing copy of the page lives in a <noscript> beside #root,
  // so a browser with JS never paints it; the data flag guards against a
  // double mount regardless of what #root happens to contain
  if (!rootElement.dataset.mounted) {
    rootElement.dataset.mounted = 'true';
    rootElement.innerHTML = '';
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
