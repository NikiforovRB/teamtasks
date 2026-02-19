import { addDays } from 'date-fns'
import type { TaskCardModel } from './TaskCard'
import { DayColumn } from './DayColumn'
import { toIsoDate } from '../../utils/dateUtils'

export function WeekView({
  weekStart,
  tasks,
  onAddTask,
  onOpenTask,
  activeId,
  overId,
}: {
  weekStart: Date
  tasks: TaskCardModel[]
  onAddTask: (date: Date) => void
  onOpenTask: (taskId: string) => void
  activeId: string | null
  overId: string | null
}) {
  const byDate = new Map<string, TaskCardModel[]>()
  for (const t of tasks) {
    const key = t.date
    const list = byDate.get(key)
    if (list) list.push(t)
    else byDate.set(key, [t])
  }

  return (
    <div className="flex gap-4 pb-3">
      {Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(weekStart, i)
        const iso = toIsoDate(d)
        return (
          <DayColumn
            key={iso}
            date={d}
            tasks={byDate.get(iso) ?? []}
            onAddTask={onAddTask}
            onOpenTask={onOpenTask}
            activeId={activeId}
            overId={overId}
          />
        )
      })}
    </div>
  )
}

