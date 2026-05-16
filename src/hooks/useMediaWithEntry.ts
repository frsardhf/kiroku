import { useQuery, useQueryClient } from '@tanstack/react-query'
import { anilistRequest } from '@/lib/anilist/client'
import { MEDIA_WITH_ENTRY_QUERY } from '@/lib/anilist/queries'
import type {
  Media,
  MediaListCollection,
  MediaListEntry,
  MediaType,
} from '@/lib/anilist/types'
import { MEDIA_LIST_KEY } from '@/hooks/useMediaList'
import { useViewer } from '@/hooks/useViewer'

interface Response {
  Media: Media & {
    mediaListEntry: Omit<MediaListEntry, 'media'> | null
  }
}

export const MEDIA_WITH_ENTRY_KEY = ['media-with-entry'] as const

export interface MediaWithEntry {
  media: Media
  entry: MediaListEntry | null
}

function findCachedEntry(
  collection: MediaListCollection | undefined,
  mediaId: number,
): MediaListEntry | null {
  if (!collection) return null
  for (const list of collection.lists) {
    for (const entry of list.entries) {
      if (entry.mediaId === mediaId) return entry
    }
  }
  return null
}

export function useMediaWithEntry(mediaId: number | null, type: MediaType) {
  const queryClient = useQueryClient()
  const { data: viewer } = useViewer()
  const userId = viewer?.id

  return useQuery({
    queryKey: [...MEDIA_WITH_ENTRY_KEY, mediaId, userId ?? null],
    enabled: mediaId != null,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<MediaWithEntry> => {
      const data = await anilistRequest<Response>(MEDIA_WITH_ENTRY_QUERY, { mediaId })
      const { mediaListEntry, ...media } = data.Media
      const entry: MediaListEntry | null = mediaListEntry
        ? { ...mediaListEntry, media }
        : null
      return { media, entry }
    },
    // Seed from list cache when available so first paint is instant.
    initialData: () => {
      if (mediaId == null) return undefined
      const collection = queryClient.getQueryData<MediaListCollection>([
        ...MEDIA_LIST_KEY,
        type,
        userId,
      ])
      const entry = findCachedEntry(collection, mediaId)
      if (entry) return { media: entry.media, entry }
      return undefined
    },
    // Inherit freshness from the list cache so React Query doesn't refetch
    // a value we just borrowed.
    initialDataUpdatedAt: () =>
      queryClient.getQueryState([...MEDIA_LIST_KEY, type, userId])?.dataUpdatedAt,
  })
}
