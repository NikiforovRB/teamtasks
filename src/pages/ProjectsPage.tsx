import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragStartEvent, type DragOverEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import eyeUrl from '../assets/eye.svg'
import eyeNavUrl from '../assets/eye-nav.svg'
import eyeoffUrl from '../assets/eyeoff.svg'
import eyeoffNavUrl from '../assets/eyeoff-nav.svg'
import deleteUrl from '../assets/delete.svg'
import deleteNavUrl from '../assets/delete-nav.svg'
import { useApp } from '../contexts/AppContext'
import { supabase } from '../services/supabase'
import { cn } from '../utils/cn'
import type { Project } from '../types'

function SortableProjectRow({
  project,
  showInsertLine,
  onToggleHidden,
  onDelete,
  onRename,
}: {
  project: Project
  showInsertLine: boolean
  onToggleHidden: (id: string, isHidden: boolean) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [eyeHover, setEyeHover] = useState(false)
  const [deleteHover, setDeleteHover] = useState(false)
  useEffect(() => {
    if (!editing) setEditName(project.name)
  }, [project.name, editing])
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: project.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function saveName() {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== project.name) onRename(project.id, trimmed)
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative flex items-center justify-between gap-3 py-3',
        isDragging && 'z-10 opacity-80',
        showInsertLine && 'before:absolute before:left-0 before:top-0 before:h-[2px] before:w-full before:bg-[#5A86EE]',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          className="shrink-0 p-1.5 text-white/50 hover:text-white"
          aria-label="Переместить"
          title="Переместить"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              className="w-full bg-[#1a1a1a] text-sm text-white outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditName(project.name)
                setEditing(true)
              }}
              className="truncate text-left text-sm text-white hover:text-white/90"
            >
              {project.name}
            </button>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onMouseEnter={() => setEyeHover(true)}
          onMouseLeave={() => setEyeHover(false)}
          onClick={() => onToggleHidden(project.id, !project.is_hidden)}
          className="p-1.5 text-white/50 hover:text-white"
          aria-label={project.is_hidden ? 'Показать' : 'Скрыть'}
          title={project.is_hidden ? 'Показать' : 'Скрыть'}
        >
          <img
            src={
              project.is_hidden
                ? eyeHover
                  ? eyeoffNavUrl
                  : eyeoffUrl
                : eyeHover
                  ? eyeNavUrl
                  : eyeUrl
            }
            alt=""
            className="h-[18px] w-[18px]"
          />
        </button>

        <button
          type="button"
          onMouseEnter={() => setDeleteHover(true)}
          onMouseLeave={() => setDeleteHover(false)}
          onClick={() => onDelete(project.id)}
          className="p-1.5"
          aria-label="Удалить"
          title="Удалить"
        >
          <img
            src={deleteHover ? deleteNavUrl : deleteUrl}
            alt=""
            className="h-[18px] w-[18px]"
          />
        </button>
      </div>
    </div>
  )
}

export function ProjectsPage() {
  const { projects, isLoadingProjects, reloadProjects } = useApp()
  const [items, setItems] = useState<Project[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    setItems(projects.slice().sort((a, b) => a.order - b.order))
  }, [projects])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const visibleItems = useMemo(() => items.filter((p) => !p.is_hidden), [items])
  const hiddenItems = useMemo(() => items.filter((p) => p.is_hidden), [items])
  const visibleIds = useMemo(() => visibleItems.map((p) => p.id), [visibleItems])
  const hiddenIds = useMemo(() => hiddenItems.map((p) => p.id), [hiddenItems])

  async function persistOrder(next: Project[]) {
    const updates = next.map((p, idx) => ({ id: p.id, order: idx }))
    const results = await Promise.all(
      updates.map((u) => supabase.from('projects').update({ order: u.order }).eq('id', u.id)),
    )
    if (results.some((r) => r.error)) {
      throw new Error('Failed to persist project order')
    }
  }

  async function onAdd() {
    const name = newName.trim()
    if (!name) return
    setIsBusy(true)
    setErrorText(null)
    try {
      const { error } = await supabase
        .from('projects')
        .insert({ name, is_hidden: false, order: Math.floor(Date.now() / 1000) })
      if (error) throw error
      setNewName('')
      await reloadProjects()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка добавления проекта'
      setErrorText(message)
    } finally {
      setIsBusy(false)
    }
  }

  async function onToggleHidden(id: string, isHidden: boolean) {
    setIsBusy(true)
    setErrorText(null)
    try {
      const { error } = await supabase.from('projects').update({ is_hidden: isHidden }).eq('id', id)
      if (error) throw error
      await reloadProjects()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка обновления проекта'
      setErrorText(message)
    } finally {
      setIsBusy(false)
    }
  }

  async function onRename(id: string, name: string) {
    if (!name.trim()) return
    setIsBusy(true)
    setErrorText(null)
    try {
      const { error } = await supabase.from('projects').update({ name: name.trim() }).eq('id', id)
      if (error) throw error
      await reloadProjects()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка переименования'
      setErrorText(message)
    } finally {
      setIsBusy(false)
    }
  }

  async function onDelete(id: string) {
    const ok = window.confirm(
      'Удалить проект?\nЕсли по нему есть задачи, у них будет выставлено: "Проект не выбран".',
    )
    if (!ok) return

    setIsBusy(true)
    setErrorText(null)
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      await reloadProjects()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка удаления проекта'
      setErrorText(message)
    } finally {
      setIsBusy(false)
    }
  }

  async function onDragEndVisible(e: DragEndEvent) {
    const active = String(e.active.id)
    const over = e.over ? String(e.over.id) : null
    setActiveId(null)
    setOverId(null)
    if (!over || active === over) return
    const oldIndex = visibleItems.findIndex((p) => p.id === active)
    const newIndex = visibleItems.findIndex((p) => p.id === over)
    if (oldIndex === -1 || newIndex === -1) return
    const reorderedVisible = arrayMove(visibleItems, oldIndex, newIndex)
    const next = [
      ...reorderedVisible.map((p, i) => ({ ...p, order: i })),
      ...hiddenItems.map((p, i) => ({ ...p, order: reorderedVisible.length + i })),
    ]
    setItems(next)
    await persistAndReload(next)
  }

  async function onDragEndHidden(e: DragEndEvent) {
    const active = String(e.active.id)
    const over = e.over ? String(e.over.id) : null
    setActiveId(null)
    setOverId(null)
    if (!over || active === over) return
    const oldIndex = hiddenItems.findIndex((p) => p.id === active)
    const newIndex = hiddenItems.findIndex((p) => p.id === over)
    if (oldIndex === -1 || newIndex === -1) return
    const reorderedHidden = arrayMove(hiddenItems, oldIndex, newIndex)
    const next = [
      ...visibleItems.map((p, i) => ({ ...p, order: i })),
      ...reorderedHidden.map((p, i) => ({ ...p, order: visibleItems.length + i })),
    ]
    setItems(next)
    await persistAndReload(next)
  }

  async function persistAndReload(next: Project[]) {

    setIsBusy(true)
    setErrorText(null)
    try {
      await persistOrder(next)
      await reloadProjects()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка сохранения порядка'
      setErrorText(message)
      await reloadProjects()
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl">Проекты</h1>
          <div className="mt-1 text-sm text-white/60">
            Скрытые проекты не показываются при добавлении новой задачи, но видны в аналитике.
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-[280px] rounded-xl bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none"
            placeholder="Новый проект…"
            disabled={isBusy}
          />
          <button
            type="button"
            onClick={() => void onAdd()}
            disabled={isBusy || newName.trim().length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-black disabled:opacity-40"
          >
            <Plus size={16} />
            Добавить
          </button>
        </div>
      </div>

      {errorText ? (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorText}
        </div>
      ) : null}

      <div className="mt-4">
        {isLoadingProjects ? (
          <div className="py-6 text-sm text-white/60">Загрузка…</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-sm text-white/60">Пока нет проектов</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
            onDragOver={(e: DragOverEvent) => setOverId(e.over ? String(e.over.id) : null)}
            onDragEnd={(e) => {
              const active = String(e.active.id)
              const over = e.over ? String(e.over.id) : null
              if (!over) return
              if (visibleIds.includes(active) && visibleIds.includes(over)) void onDragEndVisible(e)
              else if (hiddenIds.includes(active) && hiddenIds.includes(over)) void onDragEndHidden(e)
            }}
          >
            <div className="space-y-6">
              <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-0">
                  {visibleItems.map((p) => (
                    <SortableProjectRow
                      key={p.id}
                      project={p}
                      showInsertLine={Boolean(activeId && overId === p.id && activeId !== p.id)}
                      onToggleHidden={onToggleHidden}
                      onDelete={onDelete}
                      onRename={onRename}
                    />
                  ))}
                </div>
              </SortableContext>

              {hiddenItems.length > 0 ? (
                <>
                  <div className="text-xs text-white/40">Скрытые проекты</div>
                  <SortableContext items={hiddenIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-0">
                      {hiddenItems.map((p) => (
                        <SortableProjectRow
                          key={p.id}
                          project={p}
                          showInsertLine={Boolean(activeId && overId === p.id && activeId !== p.id)}
                          onToggleHidden={onToggleHidden}
                          onDelete={onDelete}
                          onRename={onRename}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </>
              ) : null}
            </div>
          </DndContext>
        )}
      </div>
    </div>
  )
}

