import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import type { MediaListEntry } from '@/lib/anilist/types'
import { ALL_STATUSES, ALL_TABS, mediaTypeSlug, type ListTab } from '@/lib/media'
import { sortEntries } from '@/lib/sort'
import { groupEntriesByCompletedDate } from '@/lib/dateGroup'
import { useAuth } from '@/hooks/useAuth'
import { useMediaList } from '@/hooks/useMediaList'
import { useListParams } from '@/hooks/useListParams'
import { Header } from '@/components/Header'
import { StatusTabs } from '@/components/StatusTabs'
import { SortControl } from '@/components/SortControl'
import { DateViewToggle } from '@/components/DateViewToggle'
import { MediaGrid } from '@/components/MediaGrid'
import { ListEditorModal } from '@/components/ListEditorModal'
import { Input } from '@/components/ui/input'

function matchesSearch(entry: MediaListEntry, query: string): boolean {
  const q = query.toLowerCase()
  const { title } = entry.media
  return (
    title.userPreferred?.toLowerCase().includes(q) ||
    title.romaji?.toLowerCase().includes(q) ||
    title.english?.toLowerCase().includes(q) ||
    false
  )
}

export function ListPage() {
  const { isAuthenticated } = useAuth()
  const {
    type,
    tab,
    sort,
    view,
    compact,
    setTab,
    setType,
    setSort,
    setView,
    setCompact,
    applyToAllTabs,
  } = useListParams()
  const { entries: allEntries, byStatus, isLoading, isError, refetch } = useMediaList(type)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => { setSearch('') }, [type])

  const counts = useMemo(() => {
    const c = {} as Record<ListTab, number>
    c.ALL = allEntries.length
    for (const s of ALL_STATUSES) c[s] = byStatus[s]?.length ?? 0
    for (const t of ALL_TABS) if (c[t] == null) c[t] = 0
    return c
  }, [byStatus, allEntries])

  const groups = useMemo(() => {
    if (tab !== 'ALL') return null
    const q = search.trim()
    return ALL_STATUSES
      .map((s) => {
        const sorted = sortEntries(byStatus[s] ?? [], sort)
        const entries = q ? sorted.filter((e) => matchesSearch(e, q)) : sorted
        return { status: s, entries }
      })
      .filter((g) => g.entries.length > 0)
  }, [tab, byStatus, sort, search])

  const entries = useMemo(() => {
    if (tab === 'ALL') return groups?.flatMap((g) => g.entries) ?? []
    const sorted = sortEntries(byStatus[tab] ?? [], sort)
    const q = search.trim()
    return q ? sorted.filter((e) => matchesSearch(e, q)) : sorted
  }, [tab, groups, byStatus, sort, search])

  const dateGroups = useMemo(() => {
    if (tab !== 'COMPLETED' || view === 'grid') return null
    return groupEntriesByCompletedDate(entries, view)
  }, [tab, view, entries])

  const editingEntry = useMemo(
    () => (editingId == null ? null : entries.find((e) => e.id === editingId) ?? null),
    [editingId, entries],
  )

  const openEntry = useCallback((entry: MediaListEntry) => setEditingId(entry.id), [])
  const closeEntry = useCallback(() => setEditingId(null), [])

  if (!isAuthenticated) return <Navigate to={`/${mediaTypeSlug(type)}/browse`} replace />

  return (
    <div className="min-h-screen flex flex-col">
      <Header type={type} onTypeChange={setType} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-5 sm:py-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <StatusTabs tab={tab} type={type} counts={counts} onChange={setTab} />
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-8 w-36 sm:w-44 h-8 text-sm"
              />
            </div>
            {tab === 'COMPLETED' && (
              <DateViewToggle
                view={view}
                compact={compact}
                onViewChange={setView}
                onCompactChange={setCompact}
              />
            )}
            <SortControl
              value={sort}
              type={type}
              onChange={setSort}
              onApplyToAll={applyToAllTabs}
            />
          </div>
        </div>

        {isLoading ? (
          <SkeletonGrid />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <MediaGrid
            entries={entries}
            type={type}
            onOpen={openEntry}
            groups={groups}
            dateGroups={dateGroups}
            compact={compact}
          />
        )}
      </main>

      <ListEditorModal
        entry={editingEntry}
        entries={entries}
        onNavigate={setEditingId}
        onClose={closeEntry}
      />
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="aspect-[2/3] rounded-xl bg-muted/40 animate-pulse" />
      ))}
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-24 text-center space-y-3">
      <p className="text-destructive text-sm font-medium">Couldn't load your list.</p>
      <button onClick={onRetry} className="underline text-sm text-muted-foreground">
        Try again
      </button>
    </div>
  )
}
