import { AlertTriangle, WifiOff } from 'lucide-react'
import { AnilistDownError } from '@/lib/anilist/client'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  error?: unknown
  message?: string
  onRetry?: () => void
}

export function ErrorState({ error, message, onRetry }: ErrorStateProps) {
  const isDown = error instanceof AnilistDownError

  return (
    <div className="py-24 flex flex-col items-center gap-4 text-center">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center">
        {isDown ? (
          <WifiOff className="size-5 text-muted-foreground" />
        ) : (
          <AlertTriangle className="size-5 text-destructive" />
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {isDown ? 'AniList is temporarily unavailable' : (message ?? 'Something went wrong')}
        </p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {isDown
            ? 'The AniList API is down for maintenance. Check back in a bit.'
            : 'There was a problem loading this content.'}
        </p>
      </div>
      {onRetry && !isDown && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
      {isDown && (
        <a
          href="https://anilist.co"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Check AniList status
        </a>
      )}
    </div>
  )
}
