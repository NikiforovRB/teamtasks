import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatWeekRange } from '../../utils/dateUtils'
import calendarUrl from '../../assets/calendar.svg'
import calendarNavUrl from '../../assets/calendar-nav.svg'

type ProjectOption = { id: string; name: string }

export function WeekNavigator({
  weekStart,
  weekEnd,
  onPrevWeek,
  onNextWeek,
  selectedEmployeeName,
  showWeekend,
  onToggleWeekend,
  filterProjectId,
  onFilterProjectChange,
  projectOptions,
}: {
  weekStart: Date
  weekEnd: Date
  onPrevWeek: () => void
  onNextWeek: () => void
  selectedEmployeeName?: string | null
  showWeekend?: boolean
  onToggleWeekend?: () => void
  filterProjectId?: string | null
  onFilterProjectChange?: (projectId: string | null) => void
  projectOptions?: ProjectOption[]
}) {
  const [calendarHover, setCalendarHover] = useState(false)
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
      {onToggleWeekend ? (
        <button
          type="button"
          onClick={onToggleWeekend}
          onMouseEnter={() => setCalendarHover(true)}
          onMouseLeave={() => setCalendarHover(false)}
          className="ml-[50px] inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/70 hover:text-white"
          aria-label={showWeekend ? 'Скрыть субботу и воскресенье' : 'Показать субботу и воскресенье'}
          title={showWeekend ? 'Скрыть субботу и воскресенье' : 'Показать субботу и воскресенье'}
        >
          <img
            src={calendarHover ? calendarNavUrl : calendarUrl}
            alt=""
            className="h-5 w-5"
          />
        </button>
      ) : null}
      {onFilterProjectChange && projectOptions ? (
        <div className="ml-[50px] shrink-0">
          <select
            value={filterProjectId ?? ''}
            onChange={(e) => onFilterProjectChange(e.target.value || null)}
            className="h-10 rounded-xl border-0 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none min-w-[160px]"
            title="Фильтр по проекту"
          >
            <option value="">Все проекты</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {selectedEmployeeName ? (
        <span className="ml-auto truncate text-sm text-white/70" title={selectedEmployeeName}>
          {selectedEmployeeName}
        </span>
      ) : null}
    </div>
  )
}

