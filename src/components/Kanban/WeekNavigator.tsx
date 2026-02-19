import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatWeekRange } from '../../utils/dateUtils'

export function WeekNavigator({
  weekStart,
  weekEnd,
  onPrevWeek,
  onNextWeek,
  selectedEmployeeName,
}: {
  weekStart: Date
  weekEnd: Date
  onPrevWeek: () => void
  onNextWeek: () => void
  selectedEmployeeName?: string | null
}) {
  return (
    <div className="flex w-full items-center gap-3">
      <button
        type="button"
        onClick={onPrevWeek}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/70 hover:text-white"
        aria-label="Предыдущая неделя"
        title="Предыдущая неделя"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="min-w-0 shrink-0 text-sm">{formatWeekRange(weekStart, weekEnd)}</div>
      <button
        type="button"
        onClick={onNextWeek}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/70 hover:text-white"
        aria-label="Следующая неделя"
        title="Следующая неделя"
      >
        <ChevronRight size={18} />
      </button>
      {selectedEmployeeName ? (
        <span className="ml-auto truncate text-sm text-white/70" title={selectedEmployeeName}>
          {selectedEmployeeName}
        </span>
      ) : null}
    </div>
  )
}

