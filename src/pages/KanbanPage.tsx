import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isValid, parseISO } from 'date-fns'
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { supabase } from '../services/supabase'
import { useApp } from '../contexts/AppContext'
import { WeekNavigator } from '../components/Kanban/WeekNavigator'
import { WeekView } from '../components/Kanban/WeekView'
import { TaskModal } from '../components/Kanban/TaskModal'
import {
  addWeeks,
  getWeekEnd,
  getWeekStart,
  toIsoDate,
} from '../utils/dateUtils'
import type { Tag, Task } from '../types'
import type { TaskCardModel } from '../components/Kanban/TaskCard'

function pickJoinedName(joined: unknown): string | null {
  if (!joined) return null
  if (Array.isArray(joined)) {
    const first = joined[0] as { name?: unknown } | undefined
    return typeof first?.name === 'string' ? first.name : null
  }
  const obj = joined as { name?: unknown }
  return typeof obj.name === 'string' ? obj.name : null
}

export function KanbanPage() {
  const { selectedEmployeeId, employees } = useApp()
  const selectedEmployeeName = useMemo(
    () => (selectedEmployeeId ? employees.find((e) => e.id === selectedEmployeeId)?.name ?? null : null),
    [selectedEmployeeId, employees],
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useState<TaskCardModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [reloadIndex, setReloadIndex] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [modal, setModal] = useState<
    | { type: 'create'; dateIso: string }
    | { type: 'edit'; taskId: string }
    | null
  >(null)
  const [showWeekend, setShowWeekend] = useState(true)

  const weekStartParam = searchParams.get('week')
  const anchorDate = useMemo(() => {
    if (!weekStartParam) return new Date()
    const d = parseISO(weekStartParam)
    return isValid(d) ? d : new Date()
  }, [weekStartParam])

  const weekStart = useMemo(() => getWeekStart(anchorDate), [anchorDate])
  const weekEnd = useMemo(() => getWeekEnd(anchorDate), [anchorDate])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function containerIdForTask(taskId: string) {
    const t = tasks.find((x) => x.id === taskId)
    if (!t) return null
    return `c:${t.date}:${t.status}`
  }

  function parseContainerId(id: string): { dateIso: string; status: 'planned' | 'completed' } | null {
    if (!id.startsWith('c:')) return null
    const parts = id.split(':')
    if (parts.length !== 3) return null
    const dateIso = parts[1]
    const status = parts[2]
    if (status !== 'planned' && status !== 'completed') return null
    return { dateIso, status }
  }

  function taskIdsInContainer(containerId: string) {
    const parsed = parseContainerId(containerId)
    if (!parsed) return []
    return tasks
      .filter((t) => t.date === parsed.dateIso && t.status === parsed.status)
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((t) => t.id)
  }

  async function persistTaskMoves(
    updates: Array<{ id: string; date: string; status: 'planned' | 'completed'; order: number }>,
  ) {
    try {
      const results = await Promise.all(
        updates.map((u) =>
          supabase
            .from('tasks')
            .update({ date: u.date, status: u.status, order: u.order })
            .eq('id', u.id),
        ),
      )
      const anyError = results.some((r) => r.error)
      if (anyError) throw new Error('Failed to persist task moves')
    } catch {
      setReloadIndex((x) => x + 1)
    }
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function onDragOver(e: DragOverEvent) {
    setOverId(e.over ? String(e.over.id) : null)
  }

  function onDragEnd(e: DragEndEvent) {
    const activeTaskId = String(e.active.id)
    const overRaw = e.over?.id
    const overKey = overRaw ? String(overRaw) : null

    setActiveId(null)
    setOverId(null)

    if (!overKey) return
    if (activeTaskId === overKey) return

    const fromContainer = containerIdForTask(activeTaskId)
    if (!fromContainer) return

    const toContainer = overKey.startsWith('c:')
      ? overKey
      : containerIdForTask(overKey)
    if (!toContainer) return

    const fromParsed = parseContainerId(fromContainer)
    const toParsed = parseContainerId(toContainer)
    if (!fromParsed || !toParsed) return

    const fromIds = taskIdsInContainer(fromContainer)
    const toIds =
      fromContainer === toContainer ? fromIds : taskIdsInContainer(toContainer)

    const activeIndex = fromIds.indexOf(activeTaskId)
    if (activeIndex === -1) return

    if (fromContainer === toContainer) {
      const overIndex = toIds.indexOf(overKey)
      if (overIndex === -1) return
      const nextIds = arrayMove(toIds, activeIndex, overIndex)
      const updates = nextIds.map((id, order) => ({
        id,
        date: fromParsed.dateIso,
        status: fromParsed.status,
        order,
      }))

      setTasks((prev) =>
        prev.map((t) => {
          const u = updates.find((x) => x.id === t.id)
          return u ? { ...t, order: u.order } : t
        }),
      )

      void persistTaskMoves(updates)
      return
    }

    const nextFrom = fromIds.filter((id) => id !== activeTaskId)
    const nextTo = toIds.slice()

    const overIndex =
      overKey.startsWith('c:') ? nextTo.length : nextTo.indexOf(overKey)
    const insertAt = overIndex === -1 ? nextTo.length : overIndex
    nextTo.splice(insertAt, 0, activeTaskId)

    const updates: Array<{ id: string; date: string; status: 'planned' | 'completed'; order: number }> = []
    nextFrom.forEach((id, order) => {
      updates.push({ id, date: fromParsed.dateIso, status: fromParsed.status, order })
    })
    nextTo.forEach((id, order) => {
      updates.push({ id, date: toParsed.dateIso, status: toParsed.status, order })
    })

    setTasks((prev) =>
      prev.map((t) => {
        const u = updates.find((x) => x.id === t.id)
        if (!u) return t
        return { ...t, date: u.date, status: u.status, order: u.order }
      }),
    )

    void persistTaskMoves(updates)
  }

  useEffect(() => {
    let mounted = true
    const startIso = toIsoDate(weekStart)
    const endIso = toIsoDate(weekEnd)

    setIsLoading(true)
    setErrorText(null)

    let q = supabase
      .from('tasks')
      .select(
        `
          id,
          project_id,
          employee_id,
          short_description,
          long_description,
          date,
          status,
          time_spent_minutes,
          "order",
          created_at,
          updated_at,
          projects(name),
          employees(name),
          tags(id, task_id, name, color, created_at)
        `,
      )
      .gte('date', startIso)
      .lte('date', endIso)
      .order('date', { ascending: true })
      .order('status', { ascending: true })
      .order('order', { ascending: true })

    if (selectedEmployeeId) {
      q = q.eq('employee_id', selectedEmployeeId)
    }

    ;(async () => {
      try {
        const { data, error } = await q
        if (!mounted) return
        if (error) {
          setErrorText(error.message)
          setTasks([])
          return
        }

        const rows = (data ?? []) as unknown[]
        const mapped = rows.map<TaskCardModel>((rowUnknown) => {
          const row = rowUnknown as any
          return {
            ...(row as Task),
            project_name: pickJoinedName(row.projects),
            employee_name: pickJoinedName(row.employees),
            tags: (Array.isArray(row.tags) ? row.tags : []) as Tag[],
          }
        })

        setTasks(mapped)
      } catch (err) {
        if (!mounted) return
        const message = err instanceof Error ? err.message : 'Ошибка загрузки задач'
        setErrorText(message)
        setTasks([])
      } finally {
        if (!mounted) return
        setIsLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [reloadIndex, selectedEmployeeId, weekEnd, weekStart])

  function setWeekStartParam(d: Date) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('week', toIsoDate(d))
      return next
    })
  }

  return (
    <div className="flex h-full flex-col px-6 py-6">
      <WeekNavigator
        weekStart={weekStart}
        weekEnd={weekEnd}
        onPrevWeek={() => setWeekStartParam(addWeeks(weekStart, -1))}
        onNextWeek={() => setWeekStartParam(addWeeks(weekStart, 1))}
        selectedEmployeeName={selectedEmployeeName}
        showWeekend={showWeekend}
        onToggleWeekend={() => setShowWeekend((v) => !v)}
      />

      {errorText ? (
        <div className="mt-4 shrink-0 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorText}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-4 shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/60">
          Загрузка задач…
        </div>
      ) : (
        <div className="mt-4 min-h-0 flex-1 overflow-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
          >
            <WeekView
              weekStart={weekStart}
              tasks={tasks}
              showWeekend={showWeekend}
              activeId={activeId}
              overId={overId}
              onAddTask={(d) => {
                setModal({ type: 'create', dateIso: toIsoDate(d) })
              }}
              onOpenTask={(taskId) => {
                setModal({ type: 'edit', taskId })
              }}
            />
          </DndContext>
        </div>
      )}

      <TaskModal
        mode={
          modal?.type === 'create'
            ? {
                type: 'create',
                defaultDateIso: modal.dateIso,
                defaultEmployeeId: selectedEmployeeId,
              }
            : modal?.type === 'edit'
              ? (() => {
                  const task = tasks.find((t) => t.id === modal.taskId)
                  return task ? ({ type: 'edit', task } as const) : null
                })()
              : null
        }
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null)
          setReloadIndex((x) => x + 1)
        }}
      />
    </div>
  )
}

