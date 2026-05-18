import { useCallback, useState } from 'react'
import type { BrowseMedia } from '@/lib/anilist/types'
import { useBrowseParams } from '@/hooks/useBrowseParams'
import { useInfiniteBrowseFilter } from '@/hooks/useInfiniteBrowseFilter'
import { Header } from '@/components/Header'
import { FilterableSearchBar } from '@/components/FilterableSearchBar'
import { FilterPanel } from '@/components/FilterPanel'
import { InfiniteGrid } from '@/components/InfiniteGrid'
import { PresetChipStrip } from '@/components/PresetChipStrip'
import { BrowseEditorModal } from '@/components/BrowseEditorModal'
import { ErrorState } from '@/components/ErrorState'

export function BrowseFilterPage() {
  const { type, filters, setFilters, replaceAll, setType, clearAll, activeCount, isEmpty } = useBrowseParams()
  const [panelOpen, setPanelOpen] = useState(false)

  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useInfiniteBrowseFilter(type, filters)

  const allMedia = data?.pages.flatMap((p) => p.media) ?? []
  const total = data?.pages[0]?.pageInfo.total ?? 0
  const [openMediaId, setOpenMediaId] = useState<number | null>(null)

  const handleOpen = useCallback((media: BrowseMedia) => {
    setOpenMediaId(media.id)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header type={type} onTypeChange={setType} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-5 sm:py-7 space-y-5">
        <FilterableSearchBar
          type={type}
          filters={filters}
          onChange={setFilters}
          onOpenFilters={() => setPanelOpen(true)}
          activeCount={activeCount}
        />

        <PresetChipStrip type={type} onApply={replaceAll} />

        {!isEmpty && !isLoading && (
          <p className="text-xs text-muted-foreground tabular-nums">
            {total.toLocaleString()} {total === 1 ? 'result' : 'results'}
          </p>
        )}

        {isLoading ? (
          <SkeletonGrid />
        ) : isError ? (
          <ErrorState error={error} message="Couldn't load results." onRetry={() => refetch()} />
        ) : allMedia.length === 0 ? (
          <EmptyState onClear={clearAll} hasFilters={!isEmpty} />
        ) : (
          <InfiniteGrid
            media={allMedia}
            type={type}
            onOpen={handleOpen}
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        )}
      </main>

      <FilterPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        type={type}
        filters={filters}
        onChange={setFilters}
        onClear={clearAll}
      />

      <BrowseEditorModal
        mediaId={openMediaId}
        navList={allMedia}
        onNavigate={setOpenMediaId}
        onClose={() => setOpenMediaId(null)}
      />
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-4">
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} className="aspect-[2/3] rounded-xl bg-muted/40 animate-pulse" />
      ))}
    </div>
  )
}


function EmptyState({ onClear, hasFilters }: { onClear: () => void; hasFilters: boolean }) {
  return (
    <div className="py-24 text-center space-y-3">
      <p className="text-sm text-muted-foreground">No results match your filters.</p>
      {hasFilters && (
        <button onClick={onClear} className="text-sm text-foreground underline">
          Clear all filters
        </button>
      )}
    </div>
  )
}
