import { useCallback, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import type { BrowseMedia, MediaType } from '@/lib/anilist/types'
import { mediaTypeFromSlug, mediaTypeSlug } from '@/lib/media'
import { getSectionConfig } from '@/lib/browseSections'
import { useInfiniteBrowseSection } from '@/hooks/useInfiniteBrowseSection'
import { Header } from '@/components/Header'
import { BrowseSearch } from '@/components/BrowseSearch'
import { InfiniteGrid } from '@/components/InfiniteGrid'
import { BrowseEditorModal } from '@/components/BrowseEditorModal'
import { ErrorState } from '@/components/ErrorState'

export function BrowseSectionPage() {
  const params = useParams<{ type?: string; section?: string }>()
  const navigate = useNavigate()
  const type: MediaType = mediaTypeFromSlug(params.type) ?? 'ANIME'
  const config = getSectionConfig(params.section ?? '')

  const setType = useCallback(
    (next: MediaType) => navigate(`/${mediaTypeSlug(next)}/browse`),
    [navigate],
  )

  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useInfiniteBrowseSection(config, type)

  const allMedia = data?.pages.flatMap((p) => p.media) ?? []
  const [openMediaId, setOpenMediaId] = useState<number | null>(null)

  const handleOpen = useCallback((media: BrowseMedia) => {
    setOpenMediaId(media.id)
  }, [])

  if (!config) return <Navigate to={`/${mediaTypeSlug(type)}/browse`} replace />

  return (
    <div className="min-h-screen flex flex-col">
      <Header type={type} onTypeChange={setType} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-5 sm:py-7 space-y-6">
        <BrowseSearch type={type} onOpen={handleOpen} />

        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            {config.title}
          </h1>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        {isLoading ? (
          <SkeletonGrid />
        ) : isError ? (
          <ErrorState error={error} message="Couldn't load results." onRetry={() => refetch()} />
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

