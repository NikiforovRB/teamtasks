import { X } from 'lucide-react'
import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { supabase } from '../../services/supabase'
import { useApp } from '../../contexts/AppContext'
import { cn } from '../../utils/cn'
import { formatDateModal } from '../../utils/dateUtils'
import { clampMinutes } from '../../utils/timeUtils'
import type { Tag, TagTemplate, TaskStatus } from '../../types'
import type { TaskCardModel } from './TaskCard'
import { TagBadge } from '../Tags/TagBadge'
import { useToast } from '../../contexts/ToastContext'
import type { TagColor } from '../../utils/constants'
import molniaredUrl from '../../assets/molniared.svg'
import deleteUrl from '../../assets/delete.svg'
import deleteNavUrl from '../../assets/delete-nav.svg'

type Mode =
  | { type: 'create'; defaultDateIso: string; defaultEmployeeId: string | null }
  | { type: 'edit'; task: TaskCardModel }

export function TaskModal({
  mode,
  onClose,
  onSaved,
}: {
  mode: Mode | null
  onClose: () => void
  onSaved: () => void
}) {
  const open = mode != null
  const { employees, projects } = useApp()
  const { addToast } = useToast()

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, handleClose])

  const initial = useMemo(() => {
    if (!mode) return null
    if (mode.type === 'create') {
      return {
        id: null as string | null,
        date: mode.defaultDateIso,
        status: 'planned' as TaskStatus,
        project_id: null as string | null,
        employee_id: mode.defaultEmployeeId,
        short_description: '',
        long_description: '',
        time_spent_minutes: null as number | null,
      }
    }
    return {
      id: mode.task.id,
      date: mode.task.date,
      status: mode.task.status,
      project_id: mode.task.project_id,
      employee_id: mode.task.employee_id,
      short_description: mode.task.short_description,
      long_description: mode.task.long_description ?? '',
      time_spent_minutes: mode.task.time_spent_minutes,
    }
  }, [mode])

  const [date, setDate] = useState('')
  const [status, setStatus] = useState<TaskStatus>('planned')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [shortDescription, setShortDescription] = useState('')
  const [longDescription, setLongDescription] = useState('')
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(0)
  const [tags, setTags] = useState<Array<Pick<Tag, 'id' | 'name' | 'color'>>>([])
  const [tagTemplates, setTagTemplates] = useState<TagTemplate[]>([])
  const [addTagOpen, setAddTagOpen] = useState(false)
  const [deleteTaskHover, setDeleteTaskHover] = useState(false)
  const [deleteTagHoverId, setDeleteTagHoverId] = useState<string | null>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setAddTagOpen(false)
    supabase
      .from('tag_templates')
      .select('id, name, color, order, created_at')
      .order('order', { ascending: true })
      .then(({ data }) => {
        setTagTemplates((data ?? []) as TagTemplate[])
      })
  }, [open])

  useEffect(() => {
    if (!initial) return
    setDate(initial.date)
    setStatus(initial.status)
    setProjectId(initial.project_id)
    setEmployeeId(initial.employee_id)
    setShortDescription(initial.short_description)
    setLongDescription(initial.long_description)

    const total = clampMinutes(initial.time_spent_minutes ?? 0)
    setHours(Math.floor(total / 60))
    setMinutes(total % 60)

    if (mode?.type === 'edit') {
      setTags(mode.task.tags.map((t) => ({ id: t.id, name: t.name, color: t.color })))
    } else {
      setTags([])
    }

    setErrorText(null)
    setIsSaving(false)
  }, [initial, mode])

  const isEdit = mode?.type === 'edit'
  const canSave = shortDescription.trim().length > 0 && date.length === 10

  const projectOptions = useMemo(() => {
    return projects.filter((p) => !p.is_hidden || p.id === projectId)
  }, [projects, projectId])

  const employeeOptions = useMemo(() => {
    return employees.filter((e) => !e.is_hidden || e.id === employeeId)
  }, [employees, employeeId])

  async function onSave() {
    if (!mode || !canSave || isSaving) return
    setIsSaving(true)
    setErrorText(null)

    const totalMinutes =
      status === 'completed' ? clampMinutes(hours * 60 + minutes) : null
    const createPayload = {
      date,
      status,
      project_id: projectId,
      employee_id: employeeId,
      short_description: shortDescription.trim(),
      long_description: longDescription.trim().length > 0 ? longDescription.trim() : null,
      time_spent_minutes: totalMinutes,
      order: Math.floor(Date.now() / 1000),
    }
    const updatePayload = {
      date: createPayload.date,
      status: createPayload.status,
      project_id: createPayload.project_id,
      employee_id: createPayload.employee_id,
      short_description: createPayload.short_description,
      long_description: createPayload.long_description,
      time_spent_minutes: createPayload.time_spent_minutes,
    }

    try {
      if (mode.type === 'create') {
        const { data, error } = await supabase
          .from('tasks')
          .insert(createPayload)
          .select('id')
          .single()
        if (error) throw error

        const taskId = (data as { id: string } | null)?.id
        if (taskId && tags.length > 0) {
          const toInsert = tags.map((t) => ({
            task_id: taskId,
            name: t.name,
            color: t.color,
          }))
          const { error: tagError } = await supabase.from('tags').insert(toInsert)
          if (tagError) throw tagError
        }
      } else {
        const { error } = await supabase
          .from('tasks')
          .update(updatePayload)
          .eq('id', mode.task.id)
        if (error) throw error
      }

      addToast('Сохранено', 'success')
      onSaved()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка сохранения'
      setErrorText(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function onDelete() {
    if (!mode || mode.type !== 'edit' || isSaving) return
    const ok = window.confirm('Удалить задачу?')
    if (!ok) return
    setIsSaving(true)
    setErrorText(null)
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', mode.task.id)
      if (error) throw error
      addToast('Задача удалена', 'success')
      onSaved()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка удаления'
      setErrorText(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function addTag(tag: { name: string; color: TagColor }) {
    if (!mode) return
    setErrorText(null)

    if (mode.type === 'create') {
      const id = `draft:${crypto.randomUUID()}`
      setTags((prev) => [...prev, { id, name: tag.name, color: tag.color }])
      return
    }

    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({ task_id: mode.task.id, name: tag.name, color: tag.color })
        .select('id, name, color')
        .single()
      if (error) throw error

      const row = data as { id: string; name: string; color: string }
      setTags((prev) => [...prev, row])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка добавления тега'
      setErrorText(message)
    }
  }

  async function removeTag(tagId: string) {
    if (!mode) return
    setErrorText(null)

    if (mode.type === 'create') {
      setTags((prev) => prev.filter((t) => t.id !== tagId))
      return
    }

    try {
      const { error } = await supabase.from('tags').delete().eq('id', tagId)
      if (error) throw error
      setTags((prev) => prev.filter((t) => t.id !== tagId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка удаления тега'
      setErrorText(message)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        onClick={handleClose}
        aria-label="Закрыть"
      />

      <div className="absolute right-0 top-0 h-full w-full max-w-[520px] border-l border-[#2f2f2f] bg-black">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <div className="text-xs text-white/50">
                {isEdit ? 'Задача' : 'Новая задача'}
              </div>
              <div className="truncate text-lg">
                {shortDescription.trim().length > 0
                  ? shortDescription.trim()
                  : isEdit
                    ? 'Без названия'
                    : 'Создание'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEdit ? (
                <button
                  type="button"
                  onMouseEnter={() => setDeleteTaskHover(true)}
                  onMouseLeave={() => setDeleteTaskHover(false)}
                  onClick={() => void onDelete()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                  aria-label="Удалить"
                  title="Удалить"
                >
                  <img
                    src={deleteTaskHover ? deleteNavUrl : deleteUrl}
                    alt=""
                    className="h-[18px] w-[18px]"
                  />
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/70 hover:text-white"
                aria-label="Закрыть"
                title="Закрыть"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-4">
              <div className="flex gap-2 rounded-xl bg-[#212121] p-1">
                <button
                  type="button"
                  onClick={() => setStatus('planned')}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-2 text-sm',
                    status === 'planned'
                      ? 'bg-[#2d2d2d] text-white'
                      : 'text-white/70 hover:bg-white/5',
                  )}
                >
                  Запланировано
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('completed')}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-2 text-sm',
                    status === 'completed'
                      ? 'bg-[#2d2d2d] text-white'
                      : 'text-white/70 hover:bg-white/5',
                  )}
                >
                  Выполнено
                </button>
              </div>

              <div className="block">
                <div className="text-xs text-white/60">Дата</div>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="absolute h-0 w-0 opacity-0 pointer-events-none"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => dateInputRef.current?.showPicker?.()}
                  className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-white outline-none bg-[#1a1a1a] hover:bg-white/10"
                >
                  {date.length === 10 ? formatDateModal(date) : 'Выберите дату'}
                </button>
              </div>

              <label className="block">
                <div className="text-xs text-white/60">Проект</div>
                <select
                  className="mt-1 w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
                  value={projectId ?? ''}
                  onChange={(e) => setProjectId(e.target.value ? e.target.value : null)}
                >
                  <option value="">Проект не выбран</option>
                  {projectOptions
                    .filter((p) => !p.is_hidden || p.id === projectId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.is_hidden ? ' (скрыт)' : ''}
                      </option>
                    ))}
                </select>
              </label>

              <label className="block">
                <div className="text-xs text-white/60">Сотрудник</div>
                <select
                  className="mt-1 w-full rounded-xl px-3 py-2 text-sm text-white outline-none bg-[#212121]"
                  value={employeeId ?? ''}
                  onChange={(e) => setEmployeeId(e.target.value ? e.target.value : null)}
                >
                  <option value="">Сотрудник не выбран</option>
                  {employeeOptions
                    .filter((p) => !p.is_hidden || p.id === employeeId)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                        {e.is_hidden ? ' (скрыт)' : ''}
                      </option>
                    ))}
                </select>
              </label>

              <label className="block">
                <div className="text-xs text-white/60">
                  Короткое описание
                </div>
                <input
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
                  placeholder="Например: Подготовить отчёт"
                />
              </label>

              <label className="block">
                <div className="text-xs text-white/60">Длинное описание</div>
                <textarea
                  value={longDescription}
                  onChange={(e) => setLongDescription(e.target.value)}
                  className="mt-1 min-h-[140px] w-full resize-y rounded-xl px-3 py-2 text-sm text-white outline-none"
                  placeholder="Детали задачи…"
                />
              </label>

              {status === 'completed' ? (
                <div className="rounded-xl p-4">
                  <div className="text-xs text-white/60">
                    Затраченное время
                  </div>
                  <div className="mt-2 flex gap-2">
                    <label className="flex-1">
                      <div className="text-[11px] text-white/40">Часы</div>
                      <input
                        type="number"
                        min={0}
                        value={hours}
                        onChange={(e) => setHours(Math.max(0, Number(e.target.value) || 0))}
                        className="mt-1 w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
                      />
                    </label>
                    <label className="flex-1">
                      <div className="text-[11px] text-white/40">Минуты</div>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={minutes}
                        onChange={(e) => {
                          const v = Number(e.target.value) || 0
                          setMinutes(Math.min(59, Math.max(0, v)))
                        }}
                        className="mt-1 w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {tags.length > 0 ? (
                  <div className="rounded-xl p-4">
                    <div className="text-xs text-white/60">Текущие теги</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map((t) => (
                        <div key={t.id} className="flex items-center gap-2">
                          <TagBadge tag={t} />
                          <button
                            type="button"
                            onMouseEnter={() => setDeleteTagHoverId(t.id)}
                            onMouseLeave={() => setDeleteTagHoverId(null)}
                            onClick={() => void removeTag(t.id)}
                            className="rounded-lg p-1"
                            aria-label="Удалить тег"
                            title="Удалить тег"
                          >
                            <img
                              src={deleteTagHoverId === t.id ? deleteNavUrl : deleteUrl}
                              alt=""
                              className="h-[14px] w-[14px]"
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAddTagOpen((v) => !v)}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-40"
                  >
                    Добавить тег
                  </button>
                  {addTagOpen ? (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        aria-hidden
                        onClick={() => setAddTagOpen(false)}
                      />
                      <div className="absolute left-0 top-full z-50 mt-1 max-h-[240px] min-w-[180px] overflow-y-auto rounded-xl bg-[#1a1a1a] py-1 shadow-lg">
                        {tagTemplates.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-white/50">
                            Нет тегов. Добавьте в разделе «Теги».
                          </div>
                        ) : (
                          tagTemplates.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                void addTag({ name: t.name, color: t.color as TagColor })
                                setAddTagOpen(false)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10"
                              style={{ color: t.color }}
                            >
                              {t.name === 'Срочно' ? (
                                <img src={molniaredUrl} alt="" className="h-2.5 w-2.5 shrink-0" />
                              ) : (
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: t.color }}
                                />
                              )}
                              <span className="truncate">{t.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {errorText ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorText}
                </div>
              ) : null}
            </div>
          </div>

          <div className="px-5 py-4">
            <button
              type="button"
              disabled={!canSave || isSaving}
              onClick={() => void onSave()}
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-black disabled:opacity-40"
            >
              {isSaving ? 'Сохраняю…' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

