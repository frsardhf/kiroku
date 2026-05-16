import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { get, set, del } from 'idb-keyval'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import { Login } from '@/routes/Login'
import { AuthCallback } from '@/routes/AuthCallback'
import { ListPage } from '@/routes/ListPage'
import { BrowsePage } from '@/routes/BrowsePage'
import { BrowseSectionPage } from '@/routes/BrowseSectionPage'
import { BrowseFilterPage } from '@/routes/BrowseFilterPage'
import { usePrefetchMediaLists } from '@/hooks/usePrefetchMediaLists'
import { useAuth } from '@/hooks/useAuth'

const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7

// Whitelist of stable query keys worth surviving a reload. Browse sections,
// search, and filter results are intentionally excluded — they're meant to
// reflect the live API on every visit.
const PERSIST_KEYS = new Set([
  'viewer',
  'media-list',
  'media-with-entry',
  'genre-collection',
  'tag-collection',
])

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 401 || status === 400) return false
        return count < 2
      },
      refetchOnWindowFocus: false,
      // Must exceed maxAge so cache entries aren't garbage-collected before
      // the persister can write them out.
      gcTime: SEVEN_DAYS,
    },
  },
})

const persister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get<string>(key).then((v) => v ?? null),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
  key: 'kirokukan-query-cache',
})

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: SEVEN_DAYS,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const root = query.queryKey[0]
            return typeof root === 'string' && PERSIST_KEYS.has(root)
          },
        },
      }}
    >
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </PersistQueryClientProvider>
  )
}

function DefaultRedirect() {
  const { isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? '/anime/list/all' : '/anime/browse'} replace />
}

function AppRoutes() {
  usePrefetchMediaLists()
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/:type/list/:status" element={<ListPage />} />
      <Route path="/:type/browse" element={<BrowsePage />} />
      <Route path="/:type/browse/search" element={<BrowseFilterPage />} />
      <Route path="/:type/browse/:section" element={<BrowseSectionPage />} />
      <Route path="/" element={<DefaultRedirect />} />
      <Route path="/list/:status" element={<DefaultRedirect />} />
      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
  )
}
