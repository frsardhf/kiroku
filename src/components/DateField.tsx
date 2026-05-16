import { CalendarIcon, XIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DateFieldProps {
  value: Date | null
  onChange: (next: Date | null) => void
  placeholder?: string
  disabled?: boolean
}

export function DateField({ value, onChange, placeholder = 'Pick a date', disabled }: DateFieldProps) {
  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start font-normal',
            !value && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="size-4 opacity-60 shrink-0" />
          <span className="flex-1 text-left">{value ? format(value, 'MMM d, yyyy') : placeholder}</span>
          {value && !disabled && (
            <span
              role="button"
              aria-label="Clear date"
              className="ml-1 shrink-0 rounded-sm opacity-50 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onChange(null) }}
            >
              <XIcon className="size-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          defaultMonth={value ?? undefined}
          onSelect={(d) => onChange(d ?? null)}
          captionLayout="dropdown"
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
