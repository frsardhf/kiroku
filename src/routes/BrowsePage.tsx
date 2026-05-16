import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { BrowseMedia, MediaType } from '@/lib/anilist/types'
import { mediaTypeFromSlug, mediaTypeSlug } from '@/lib/media'
import { useBrowseData } from '@/hooks/useBrowseData'
import { Header } from '@/components/Header'
import { BrowseSearch } from '@/components/BrowseSearch'
import { BrowseSection } from '@/components/BrowseSection'
import { Top100Grid } from '@/components/Top100Grid'
import { BrowseEditorModal } from '@/components/BrowseEditorModal'

interface EditorCtx {
  mediaId: number
  list: BrowseMedia[]
}

export function BrowsePage() {
  const params = useParams<{ type?: string }>()
  const navigate = useNavigate()
  const type: MediaType = mediaTypeFromSlug(params.type) ?? 'ANIME'

  const setType = useCallback(
    (next: MediaType) => {
      navigate(`/${mediaTypeSlug(next)}/browse`)
    },
    [navigate],
  )

  const { data, isLoading, isError, refetch } = useBrowseData(type)
  const [editor, setEditor] = useState<EditorCtx | null>(null)

  const openInSection = useCallback(
    (list: BrowseMedia[]) => (media: BrowseMedia) => setEditor({ mediaId: media.id, list }),
    [],
  )
  // Single-item context (search results): nav with just that one item.
  const handleOpen = useCallback((media: BrowseMedia) => {
    setEditor({ mediaId: media.id, list: [media] })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header type={type} onTypeChange={setType} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-5 sm:py-7 space-y-8">
        <BrowseSearch type={type} onOpen={handleOpen} />

        {isLoading ? (
          <SkeletonSections />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : data ? (
          <>
            {type === 'ANIME' && (
              <>
                <BrowseSection
                  title="Popular This Season"
                  media={data.popularThisSeason}
                  type={type}
                  variant="full"
                  viewAllSlug="popular-this-season"
                  onOpen={openInSection(data.popularThisSeason)}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <BrowseSection
                    title="Trending Now"
                    media={data.trending}
                    type={type}
                    variant="half"
                    hideMeta
                    viewAllSlug="trending"
                    onOpen={openInSection(data.trending)}
                  />
                  <BrowseSection
                    title="Upcoming Next Season"
                    media={data.upcomingNextSeason}
                    type={type}
                    variant="half"
                    hideMeta
                    viewAllSlug="upcoming"
                    onOpen={openInSection(data.upcomingNextSeason)}
                  />
                </div>
              </>
            )}

            <BrowseSection
              title="All-Time Popular"
              media={data.allTimePopular}
              type={type}
              variant="full"
              viewAllSlug="all-time-popular"
              onOpen={openInSection(data.allTimePopular)}
            />

            <Top100Grid media={data.top100} type={type} onOpen={openInSection(data.top100)} />
          </>
        ) : null}
      </main>

      <BrowseEditorModal
        mediaId={editor?.mediaId ?? null}
        navList={editor?.list ?? []}
        onNavigate={(id) => setEditor((cur) => (cur ? { ...cur, mediaId: id } : cur))}
        onClose={() => setEditor(null)}
      />
    </div>
  )
}

function SkeletonSections() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 3 }).map((_, s) => (
        <div key={s} className="space-y-3">
          <div className="h-4 w-40 rounded bg-muted/40 animate-pulse" />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-24 text-center space-y-3">
      <p className="text-destructive text-sm font-medium">Couldn't load browse data.</p>
      <button onClick={onRetry} className="underline text-sm text-muted-foreground">
        Try again
      </button>
    </div>
  )
}
