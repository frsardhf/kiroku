import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { MediaListEntry, MediaType } from '@/lib/anilist/types'
import { dateToFuzzy, fuzzyDateRange, seasonLabel } from '@/lib/media'
import { StatusBadge } from '@/components/StatusBadge'
import { QuickStatusButtons } from '@/components/QuickStatusButtons'
import { useUpdateEntry } from '@/hooks/useUpdateEntry'
import { cn } from '@/lib/utils'

interface MediaCardProps {
  entry: MediaListEntry
  type: MediaType
  onOpen: (entry: MediaListEntry) => void
}

export function MediaCard({ entry, type, onOpen }: MediaCardProps) {
  const [loaded, setLoaded] = useState(false)
  const update = useUpdateEntry()
  const { media } = entry
  const isManga = type === 'MANGA'
  const title = media.title.userPreferred || media.title.romaji || media.title.english || ''
  const coverUrl = media.coverImage.extraLarge ?? media.coverImage.large ?? ''
  const placeholderColor = media.coverImage.color ?? '#1f1f1f'
  const season = isManga ? '' : seasonLabel(media.season, media.seasonYear)
  const dateRange = fuzzyDateRange(media.startDate, media.endDate)

  const lengthValue = isManga ? media.chapters : media.episodes
  const lengthUnit = isManga ? 'ch' : 'ep'
  const length =
    lengthValue != null
      ? `${lengthValue} ${lengthUnit}${!isManga && lengthValue === 1 ? '' : isManga ? '' : 's'}`
      : null

  const progressMax = isManga ? media.chapters : media.episodes
  const progress = entry.progress > 0 ? entry.progress : null
  const canIncrement =
    entry.status === 'CURRENT' && (progressMax == null || entry.progress < progressMax)

  const handleOpen = () => onOpen(entry)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen(entry)
    }
  }

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (update.isPending) return
    const nextProgress = entry.progress + 1
    const reachedMax = progressMax != null && nextProgress >= progressMax
    const patch: Parameters<typeof update.mutate>[0] = { entry, progress: nextProgress }
    if (reachedMax) {
      patch.status = 'COMPLETED'
      if (!entry.completedAt?.year) patch.completedAt = dateToFuzzy(new Date())
    }
    update.mutate(patch)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      aria-label={title}
      className={cn(
        'group relative w-full overflow-hidden rounded-xl bg-card text-left shadow-sm transition-all cursor-pointer',
        'aspect-[2/3]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'md:hover:shadow-xl md:hover:-translate-y-0.5',
      )}
      style={{ backgroundColor: placeholderColor }}
    >
      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            'absolute inset-0 size-full object-cover transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}

      <div className="absolute top-2 right-2 z-20">
        <StatusBadge status={entry.status} type={type} variant="dot" />
      </div>

      {progress != null && progressMax != null && progress > 0 && progress < progressMax && (
        <div className="absolute top-2 left-2 z-20">
          <span className="inline-flex h-5 items-center rounded-full bg-black/55 px-2 text-[10px] font-medium leading-none text-white backdrop-blur-sm">
            {progress} / {progressMax}
          </span>
        </div>
      )}

      {progress != null && progressMax != null && progress > 0 && (
        <div className="absolute bottom-0 inset-x-0 z-20 h-0.5 bg-white/20">
          <div
            className="h-full bg-white/70 transition-all"
            style={{ width: `${Math.min(100, (progress / progressMax) * 100)}%` }}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10 transition-opacity md:group-hover:opacity-0">
        <h3 className="text-sm font-medium text-white line-clamp-2 leading-tight drop-shadow">{title}</h3>
        {(season || length) && (
          <p className="mt-1 text-[11px] text-white/70">
            {[length, season].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      <div
        className={cn(
          'absolute inset-0 hidden flex-col justify-between gap-3 bg-black/80 px-4 pb-3 pt-10 text-white backdrop-blur-sm',
          'opacity-0 transition-opacity duration-200',
          'md:flex md:group-hover:opacity-100',
        )}
      >
        <div className="shrink-0">
          <h3 className="text-base font-semibold leading-snug line-clamp-3">{title}</h3>
          <div className="mt-1 text-[11px] text-white/70 flex flex-wrap gap-x-2">
            {length && <span>{length}</span>}
            {season && <span>{season}</span>}
          </div>
          {dateRange && <p className="mt-1 text-[11px] text-white/60">{dateRange}</p>}
        </div>
        <div className="shrink-0 space-y-1.5">
          {canIncrement && (
            <button
              type="button"
              onClick={handleIncrement}
              disabled={update.isPending}
              aria-label={isManga ? 'Bump chapter by 1' : 'Bump episode by 1'}
              className="inline-flex h-7 w-full items-center justify-center gap-1 rounded-md bg-white/15 px-2 text-[11px] font-medium text-white transition-colors hover:bg-white/30 disabled:opacity-50"
            >
              <Plus className="size-3" />
              {isManga ? '1 chapter' : '1 episode'}
            </button>
          )}
          <QuickStatusButtons entry={entry} type={type} />
        </div>
      </div>
    </div>
  )
}
