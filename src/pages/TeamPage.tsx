import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
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
import type { Employee } from '../types'

function SortableEmployeeRow({
  employee,
  showInsertLine,
  onToggleHidden,
  onDelete,
  onRename,
  onAvatarChange,
}: {
  employee: Employee
  showInsertLine: boolean
  onToggleHidden: (id: string, isHidden: boolean) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onAvatarChange: (id: string, file: File) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(employee.name)
  const [eyeHover, setEyeHover] = useState(false)
  const [deleteHover, setDeleteHover] = useState(false)
  useEffect(() => {
    if (!editing) setEditName(employee.name)
  }, [employee.name, editing])
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: employee.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const initial = (employee.name.trim()[0] ?? '?').toUpperCase()

  function saveName() {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== employee.name) onRename(employee.id, trimmed)
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative flex items-center justify-between gap-3 py-3',
        isDragging && 'z-10 opacity-80',
        showInsertLine &&
          'before:absolute before:left-0 before:top-0 before:h-[2px] before:w-full before:bg-[#5A86EE]',
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

        <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs text-white/70">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onAvatarChange(employee.id, file)
              e.target.value = ''
            }}
          />
          {employee.avatar_url ? (
            <img src={employee.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </label>

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
                setEditName(employee.name)
                setEditing(true)
              }}
              className="truncate text-left text-sm text-white hover:text-white/90"
            >
              {employee.name}
            </button>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onMouseEnter={() => setEyeHover(true)}
          onMouseLeave={() => setEyeHover(false)}
          onClick={() => onToggleHidden(employee.id, !employee.is_hidden)}
          className="p-1.5 text-white/50 hover:text-white"
          aria-label={employee.is_hidden ? 'Показать' : 'Скрыть'}
          title={employee.is_hidden ? 'Показать' : 'Скрыть'}
        >
          <img
            src={
              employee.is_hidden
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
          onClick={() => onDelete(employee.id)}
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

export function TeamPage() {
  const { employees, isLoadingEmployees, reloadEmployees } = useApp()
  const [items, setItems] = useState<Employee[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    setItems(employees.slice().sort((a, b) => a.order - b.order))
  }, [employees])

  const visibleItems = useMemo(() => items.filter((e) => !e.is_hidden), [items])
  const hiddenItems = useMemo(() => items.filter((e) => e.is_hidden), [items])
  const visibleIds = useMemo(() => visibleItems.map((e) => e.id), [visibleItems])
  const hiddenIds = useMemo(() => hiddenItems.map((e) => e.id), [hiddenItems])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  async function persistOrder(next: Employee[]) {
    const updates = next.map((e, idx) => ({ id: e.id, order: idx }))
    const results = await Promise.all(
      updates.map((u) => supabase.from('employees').update({ order: u.order }).eq('id', u.id)),
    )
    if (results.some((r) => r.error)) {
      throw new Error('Failed to persist employee order')
    }
  }

  async function onAdd() {
    const name = newName.trim()
    if (!name) return
    setIsBusy(true)
    setErrorText(null)
    try {
      const { error } = await supabase
        .from('employees')
        .insert({ name, is_hidden: false, order: Math.floor(Date.now() / 1000) })
      if (error) throw error
      setNewName('')
      await reloadEmployees()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка добавления сотрудника'
      setErrorText(message)
    } finally {
      setIsBusy(false)
    }
  }

  async function onToggleHidden(id: string, isHidden: boolean) {
    setIsBusy(true)
    setErrorText(null)
    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_hidden: isHidden })
        .eq('id', id)
      if (error) throw error
      await reloadEmployees()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка обновления сотрудника'
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
      const { error } = await supabase.from('employees').update({ name: name.trim() }).eq('id', id)
      if (error) throw error
      await reloadEmployees()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка переименования'
      setErrorText(message)
    } finally {
      setIsBusy(false)
    }
  }

  async function onAvatarChange(id: string, file: File) {
    setIsBusy(true)
    setErrorText(null)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const { error: updateError } = await supabase
        .from('employees')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', id)
      if (updateError) throw updateError
      await reloadEmployees()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки фото'
      setErrorText(message)
    } finally {
      setIsBusy(false)
    }
  }

  async function onDelete(id: string) {
    const ok = window.confirm(
      'Удалить сотрудника?\nЕсли по нему есть задачи, у них будет выставлено: "Сотрудник не выбран".',
    )
    if (!ok) return

    setIsBusy(true)
    setErrorText(null)
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id)
      if (error) throw error
      await reloadEmployees()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка удаления сотрудника'
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

  async function persistAndReload(next: Employee[]) {
    setIsBusy(true)
    setErrorText(null)
    try {
      await persistOrder(next)
      await reloadEmployees()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка сохранения порядка'
      setErrorText(message)
      await reloadEmployees()
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl">Команда</h1>
          <div className="mt-1 text-sm text-white/60">
            Скрытые сотрудники не показываются в меню и при добавлении задач, но видны в аналитике.
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-[280px] rounded-xl bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none"
            placeholder="Новый сотрудник…"
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
        {isLoadingEmployees ? (
          <div className="py-6 text-sm text-white/60">Загрузка…</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-sm text-white/60">Пока нет сотрудников</div>
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
                <div className="space-y-2">
                  {visibleItems.map((e) => (
                    <SortableEmployeeRow
                      key={e.id}
                      employee={e}
                      showInsertLine={Boolean(activeId && overId === e.id && activeId !== e.id)}
                      onToggleHidden={onToggleHidden}
                      onDelete={onDelete}
                      onRename={onRename}
                      onAvatarChange={onAvatarChange}
                    />
                  ))}
                </div>
              </SortableContext>

              {hiddenItems.length > 0 ? (
                <>
                  <div className="text-xs text-white/40">Скрытые сотрудники</div>
                  <SortableContext items={hiddenIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {hiddenItems.map((e) => (
                        <SortableEmployeeRow
                          key={e.id}
                          employee={e}
                          showInsertLine={Boolean(activeId && overId === e.id && activeId !== e.id)}
                          onToggleHidden={onToggleHidden}
                          onDelete={onDelete}
                          onRename={onRename}
                          onAvatarChange={onAvatarChange}
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

