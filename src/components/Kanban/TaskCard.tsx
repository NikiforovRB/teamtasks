import type { Tag, Task, TaskStatus } from '../../types'
import { cn } from '../../utils/cn'
import { formatMinutes } from '../../utils/timeUtils'
import molniaredUrl from '../../assets/molniared.svg'
import detailsUrl from '../../assets/details.svg'

export type TaskCardModel = Task & {
  project_name: string | null
  employee_name: string | null
  tags: Tag[]
}

function TagsRow({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) return null
  return (
    <div className="-ml-2 mt-2 flex flex-wrap gap-2">
      {tags.map((t) => (
        <div
          key={t.id}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs"
          style={{ color: t.color }}
          title={t.name}
        >
          {t.name === 'Срочно' ? (
            <img src={molniaredUrl} alt="" className="h-2.5 w-2.5 shrink-0" />
          ) : (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: t.color }}
            />
          )}
          <span className="max-w-[160px] truncate">{t.name}</span>
        </div>
      ))}
    </div>
  )
}

function ProjectEmployeeLine({
  project,
  employee,
}: {
  project: string | null
  employee: string | null
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs text-white/70">
      <span className="truncate">
        {project && project.trim().length > 0 ? project : 'Проект не выбран'}
      </span>
      <span className="text-white/30">•</span>
      <span className="truncate">
        {employee && employee.trim().length > 0 ? employee : 'Сотрудник не выбран'}
      </span>
    </div>
  )
}

export function TaskCard({
  task,
}: {
  task: TaskCardModel
  onOpen?: (taskId: string) => void
}) {
  const status: TaskStatus = task.status
  const time =
    status === 'completed' && task.time_spent_minutes != null
      ? formatMinutes(task.time_spent_minutes)
      : null

  const hasLongDescription = Boolean(
    task.long_description && task.long_description.trim().length > 0,
  )

  return (
    <div
      className={cn(
        'relative w-full cursor-grab rounded-xl p-3 text-left active:cursor-grabbing',
        'bg-[#171717] hover:bg-[#212121]',
        status === 'completed' && 'opacity-90',
      )}
    >
      {hasLongDescription ? (
        <div className="absolute right-3 top-3">
          <img src={detailsUrl} alt="" className="h-4 w-4 opacity-70" />
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <ProjectEmployeeLine
          project={task.project_name}
          employee={task.employee_name}
        />
      </div>

      <div className="mt-2 text-sm leading-snug">
        {task.short_description}
      </div>

      {time ? (
        <div className="mt-2 text-[11px] text-[#15c466]">
          {time}
        </div>
      ) : null}

      <TagsRow tags={task.tags} />
    </div>
  )
}

