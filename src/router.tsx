import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexProvider } from 'convex/react'

import { routeTree } from './routeTree.gen'

const isServer = typeof window === 'undefined'

export function getRouter() {
  const CONVEX_URL = import.meta.env.VITE_CONVEX_URL

  if (!CONVEX_URL) {
    throw new Error(
      'Missing VITE_CONVEX_URL environment variable. ' +
        'Please run "npx convex dev" in a separate terminal to set up Convex, ' +
        'or add VITE_CONVEX_URL to your .env.local file.'
    )
  }

  // Only create Convex client on the client side to avoid SSR connection issues
  // in Cloudflare Workers. The home page doesn't need Convex data during SSR.
  const convexQueryClient = isServer ? null : new ConvexQueryClient(CONVEX_URL)

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Use Convex query functions only on client
        ...(convexQueryClient && {
          queryKeyHashFn: convexQueryClient.hashFn(),
          queryFn: convexQueryClient.queryFn(),
        }),
      },
    },
  })

  if (convexQueryClient) {
    convexQueryClient.connect(queryClient)
  }

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    Wrap: ({ children }) =>
      convexQueryClient ? (
        <ConvexProvider client={convexQueryClient.convexClient}>
          {children}
        </ConvexProvider>
      ) : (
        <>{children}</>
      ),
  })

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
