import { useState } from 'react'
import { Compass, LogOut, RefreshCw } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { MediaType } from '@/lib/anilist/types'
import { mediaTypeSlug } from '@/lib/media'
import { Button } from '@/components/ui/button'
import { MediaTypeToggle } from '@/components/MediaTypeToggle'
import { useAuth } from '@/hooks/useAuth'
import { useViewer } from '@/hooks/useViewer'
import { MEDIA_LIST_KEY } from '@/hooks/useMediaList'
import { BROWSE_KEY } from '@/hooks/useBrowseData'
import { cn } from '@/lib/utils'

interface HeaderProps {
  type: MediaType
  onTypeChange: (next: MediaType) => void
}

export function Header({ type, onTypeChange }: HeaderProps) {
  const queryClient = useQueryClient()
  const { isAuthenticated, logout } = useAuth()
  const { data: viewer } = useViewer()
  const location = useLocation()
  const isBrowse = location.pathname.includes('/browse')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    const key = isBrowse ? BROWSE_KEY : MEDIA_LIST_KEY
    await queryClient.invalidateQueries({ queryKey: [...key, type] })
    setRefreshing(false)
  }

  const homeTo = isAuthenticated
    ? `/${mediaTypeSlug(type)}/list/all`
    : `/${mediaTypeSlug(type)}/browse`

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={homeTo}
            className="flex items-center gap-2.5 shrink-0"
            aria-label="Kirokukan home"
          >
            <div className={cn(
              'size-8 rounded-lg grid place-items-center text-base font-semibold transition-colors border',
              isBrowse
                ? 'bg-transparent text-foreground border-foreground'
                : 'bg-foreground text-background border-transparent',
            )}>
              記
            </div>
            <span className="text-lg font-semibold tracking-tight">Kirokukan</span>
          </Link>
          <MediaTypeToggle value={type} onChange={onTypeChange} />
          {isAuthenticated && (
            <Link
              to={`/${mediaTypeSlug(type)}/browse`}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
                isBrowse
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Compass className="size-4" />
              Browse
            </Link>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isAuthenticated ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                aria-label="Refresh"
                disabled={refreshing}
              >
                <RefreshCw className={cn('size-5', refreshing && 'animate-spin')} />
              </Button>
              {viewer?.avatar?.medium && (
                <img
                  src={viewer.avatar.medium}
                  alt={viewer.name}
                  className="size-8 rounded-full object-cover"
                />
              )}
              <Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out">
                <LogOut className="size-5" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
