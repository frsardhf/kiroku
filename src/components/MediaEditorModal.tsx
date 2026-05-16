import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react'
import type { MediaListEntry, MediaListStatus } from '@/lib/anilist/types'
import { ALL_STATUSES, fuzzyDateRange, seasonLabel, statusLabel } from '@/lib/media'
import {
  applyStatusAutofill,
  buildPatch,
  getFormWarnings,
  isFormDirty,
  toFormState,
  type FormState,
} from '@/lib/entryForm'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateField } from '@/components/DateField'
import { Synopsis } from '@/components/Synopsis'
import { StatusBadge } from '@/components/StatusBadge'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useUpdateEntry } from '@/hooks/useUpdateEntry'
import { cn } from '@/lib/utils'

export interface MediaEditorNav {
  index: number
  total: number
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
}

interface MediaEditorModalProps {
  open: boolean
  entry: MediaListEntry | null
  isNew?: boolean
  isLoading?: boolean
  nav?: MediaEditorNav
  onClose: () => void
}

export function MediaEditorModal({
  open,
  entry,
  isNew = false,
  isLoading = false,
  nav,
  onClose,
}: MediaEditorModalProps) {
  const isMobile = useIsMobile()
  const update = useUpdateEntry()
  const [form, setForm] = useState<FormState | null>(null)
  const formRef = useRef<FormState | null>(null)
  const entryRef = useRef<MediaListEntry | null>(null)

  // Reset form when the underlying entry changes. Drafts share id=0, so key
  // off mediaId too.
  const formKey = entry ? `${entry.id}:${entry.mediaId}` : null
  useEffect(() => {
    if (entry) {
      const next = toFormState(entry)
      setForm(next)
      formRef.current = next
    } else {
      setForm(null)
      formRef.current = null
    }
    entryRef.current = entry
  }, [formKey])

  useEffect(() => {
    formRef.current = form
  }, [form])
  useEffect(() => {
    entryRef.current = entry
  }, [entry])

  const handleNavigate = useCallback(
    (dir: -1 | 1) => {
      if (!nav) return
      const curEntry = entryRef.current
      const curForm = formRef.current
      // Save in-flight edits, but only for existing entries — auto-creating
      // a new entry just from arrow-key nav would be surprising.
      if (curEntry && curEntry.id && curForm && isFormDirty(curForm, curEntry)) {
        update.mutate(buildPatch(curEntry, curForm))
      }
      if (dir === -1 && nav.canPrev) nav.onPrev()
      if (dir === 1 && nav.canNext) nav.onNext()
    },
    [nav, update],
  )

  useEffect(() => {
    if (!open || !nav) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
      }
      e.preventDefault()
      handleNavigate(e.key === 'ArrowLeft' ? -1 : 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, nav, handleNavigate])

  if (!open) return null

  const handleSave = () => {
    if (!entry || !form) return
    update.mutate(buildPatch(entry, form), { onSuccess: () => onClose() })
  }

  const body =
    !entry || !form ? (
      <LoadingBody />
    ) : (
      <EditorBody entry={entry} isNew={isNew} form={form} setForm={setForm} />
    )

  const saveLabel = isNew ? 'Add to list' : 'Save'
  const footer = (
    <div className="flex items-center justify-between gap-2">
      {nav ? <NavHeader nav={nav} onNavigate={handleNavigate} /> : <span />}
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onClose} disabled={update.isPending}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={update.isPending || !form || isLoading}>
          {update.isPending ? 'Saving…' : saveLabel}
        </Button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl gap-3 px-4 pb-4">
          <SheetTitle className="sr-only">Edit entry</SheetTitle>
          {body}
          <div className="pt-2">{footer}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogTitle className="sr-only">Edit entry</DialogTitle>
        {body}
        <div className="pt-2">{footer}</div>
      </DialogContent>
    </Dialog>
  )
}

function NavHeader({ nav, onNavigate }: { nav: MediaEditorNav; onNavigate: (dir: -1 | 1) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onNavigate(-1)}
        disabled={!nav.canPrev}
        aria-label="Previous"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="text-xs text-muted-foreground tabular-nums">
        {nav.index + 1} / {nav.total}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onNavigate(1)}
        disabled={!nav.canNext}
        aria-label="Next"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}

function LoadingBody() {
  return (
    <div className="flex items-center justify-center h-72">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

interface EditorBodyProps {
  entry: MediaListEntry
  isNew: boolean
  form: FormState
  setForm: (f: FormState) => void
}

function EditorBody({ entry, isNew, form, setForm }: EditorBodyProps) {
  const media = entry.media
  const type = media.type
  const isManga = type === 'MANGA'
  const title = media.title.userPreferred || media.title.romaji || ''
  const cover = media.coverImage.extraLarge ?? media.coverImage.large ?? ''
  const placeholderColor = media.coverImage.color ?? '#1f1f1f'
  const progressLabel = isManga ? 'Chapters' : 'Episodes'
  const progressMax = isManga ? media.chapters : media.episodes
  const showVolumes = isManga && media.volumes != null
  const volumesMax = media.volumes
  const season = isManga ? '' : seasonLabel(media.season, media.seasonYear)
  const dateRange = fuzzyDateRange(media.startDate, media.endDate)
  const lengthVal = isManga ? media.chapters : media.episodes
  const lengthUnit = isManga ? 'ch' : 'ep'
  const lengthStr = lengthVal != null ? `${lengthVal} ${lengthUnit}` : null
  const metaParts = [media.format, lengthStr, season].filter(Boolean) as string[]
  const warnings = getFormWarnings(form, entry)

  const onStatusChange = (next: MediaListStatus) => setForm(applyStatusAutofill(form, next, media))

  const statusBadge = isNew ? (
    <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground/70 shrink-0">
      Not in list
    </span>
  ) : (
    <StatusBadge status={entry.status} type={type} />
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-4 h-[264px] sm:h-[312px]">
        <div
          className="shrink-0 w-44 sm:w-52 h-full rounded-lg overflow-hidden bg-muted"
          style={{ backgroundColor: placeholderColor }}
        >
          {cover && (
            <img
              src={cover}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-2 self-stretch">
          <div className="shrink-0 flex flex-col gap-1.5">
            <h2 className="text-base sm:text-lg font-semibold leading-snug line-clamp-3">{title}</h2>
            <div className="hidden sm:flex items-center gap-2">
              {([...metaParts, dateRange].filter(Boolean).length > 0) && (
                <p className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
                  {[...metaParts, dateRange].filter(Boolean).join(' · ')}
                </p>
              )}
              {statusBadge}
            </div>
            <div className="sm:hidden flex flex-col gap-1">
              {metaParts.length > 0 && (
                <p className="text-xs text-muted-foreground">{metaParts.join(' · ')}</p>
              )}
              {dateRange && <p className="text-xs text-muted-foreground">{dateRange}</p>}
              {statusBadge}
            </div>
          </div>
          {media.description && (
            <div className="flex-1 min-h-0 overflow-y-auto rounded-md border bg-muted/30 p-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
              <Synopsis description={media.description} variant="full" className="text-[13px] leading-relaxed" />
            </div>
          )}
        </div>
      </div>

      <div className="pt-1 border-t border-border/60 space-y-4">
        <div className={cn('grid gap-3', showVolumes ? 'grid-cols-5' : 'grid-cols-4')}>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => onStatusChange(v as MediaListStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel(s, type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              {progressLabel}
              {progressMax != null && (
                <span className="text-muted-foreground font-normal"> / {progressMax}</span>
              )}
            </Label>
            <div className="flex gap-1.5">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={progressMax ?? undefined}
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: e.target.value })}
                placeholder="0"
                className="flex-1 min-w-0"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const current = parseInt(form.progress, 10) || 0
                  const next = progressMax != null ? Math.min(current + 1, progressMax) : current + 1
                  setForm({ ...form, progress: String(next) })
                }}
                disabled={progressMax != null && (parseInt(form.progress, 10) || 0) >= progressMax}
                aria-label="Bump by 1"
                className="shrink-0"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          {showVolumes && (
            <div className="space-y-1.5">
              <Label>
                Volumes
                {volumesMax != null && (
                  <span className="text-muted-foreground font-normal"> / {volumesMax}</span>
                )}
              </Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={volumesMax ?? undefined}
                value={form.progressVolumes}
                onChange={(e) => setForm({ ...form, progressVolumes: e.target.value })}
                placeholder="0"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Started</Label>
            <DateField value={form.startedAt} onChange={(d) => setForm({ ...form, startedAt: d })} />
          </div>
          <div className="space-y-1.5">
            <Label>Finished</Label>
            <DateField value={form.completedAt} onChange={(d) => setForm({ ...form, completedAt: d })} />
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="space-y-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-300">
                <AlertTriangle className="size-3.5 shrink-0 mt-px" />
                <span className="flex-1">{w.message}</span>
                {w.action && (
                  <button
                    type="button"
                    onClick={() => setForm(applyStatusAutofill(form, w.action!.status, media))}
                    className="shrink-0 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 transition-colors"
                  >
                    {w.action.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium">{children}</label>
}
