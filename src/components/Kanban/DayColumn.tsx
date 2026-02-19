import { Plus } from 'lucide-react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import type { TaskCardModel } from './TaskCard'
import { formatDayHeader } from '../../utils/dateUtils'
import { toIsoDate } from '../../utils/dateUtils'
import { clampMinutes, formatMinutes } from '../../utils/timeUtils'
import { cn } from '../../utils/cn'
import { SortableTaskItem } from './SortableTaskItem'

function TaskList({
  containerId,
  title,
  tasks,
  activeId,
  overId,
  onOpenTask,
}: {
  containerId: string
  title: string
  tasks: TaskCardModel[]
  activeId: string | null
  overId: string | null
  onOpenTask: (taskId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: containerId })
  const ids = tasks.map((t) => t.id)
  const showContainerLine = Boolean(activeId && overId === containerId)

  return (
    <div className="space-y-2">
      {tasks.length > 0 && title ? (
        <div className="text-xs text-white/50">{title}</div>
      ) : null}

      <div
        ref={setNodeRef}
        className={cn(
          'relative min-h-[56px] rounded-xl py-2 pr-2',
          isOver && 'bg-white/[0.04]',
          showContainerLine &&
            'after:absolute after:left-0 after:right-2 after:bottom-1 after:h-[2px] after:bg-[#5A86EE]',
        )}
      >
        {tasks.length === 0 ? null : (
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {tasks.map((t) => (
                <SortableTaskItem
                  key={t.id}
                  task={t}
                  containerId={containerId}
                  showInsertLine={Boolean(activeId && overId === t.id && activeId !== t.id)}
                  onOpen={onOpenTask}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  )
}

export function DayColumn({
  date,
  tasks,
  onAddTask,
  onOpenTask,
  activeId,
  overId,
}: {
  date: Date
  tasks: TaskCardModel[]
  onAddTask: (date: Date) => void
  onOpenTask: (taskId: string) => void
  activeId: string | null
  overId: string | null
}) {
  const planned = tasks
    .filter((t) => t.status === 'planned')
    .sort((a, b) => a.order - b.order)

  const completed = tasks
    .filter((t) => t.status === 'completed')
    .sort((a, b) => a.order - b.order)

  const totalMinutes = completed.reduce(
    (acc, t) => acc + clampMinutes(t.time_spent_minutes ?? 0),
    0,
  )

  return (
    <div className="flex min-w-[320px] flex-col gap-3 rounded-xl p-3">
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">{formatDayHeader(date)}</div>
          <button
          type="button"
          onClick={() => onAddTask(date)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/70 hover:text-white"
          aria-label="Добавить задачу"
          title="Добавить задачу"
        >
          <Plus size={18} />
        </button>
        </div>
        <div className="mt-2 h-px w-full shrink-0 bg-[#2f2f2f]" />
      </div>

      <TaskList
        containerId={`c:${toIsoDate(date)}:planned`}
        title=""
        tasks={planned}
        activeId={activeId}
        overId={overId}
        onOpenTask={onOpenTask}
      />

      <TaskList
        containerId={`c:${toIsoDate(date)}:completed`}
        title="Выполнено"
        tasks={completed}
        activeId={activeId}
        overId={overId}
        onOpenTask={onOpenTask}
      />

      {completed.length > 0 ? (
        <div className="mt-auto px-3 py-2 text-xs text-white/70">
          Итого за день: <span className="text-[#15c466]">{formatMinutes(totalMinutes)}</span>
        </div>
      ) : null}
    </div>
  )
}

