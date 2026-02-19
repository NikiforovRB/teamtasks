import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { cn } from '../utils/cn'
import { TAG_COLORS, type TagColor } from '../utils/constants'
import type { TagTemplate } from '../types'
import molniaredUrl from '../assets/molniared.svg'
import deleteUrl from '../assets/delete.svg'
import deleteNavUrl from '../assets/delete-nav.svg'

export function TagsPage() {
  const [templates, setTemplates] = useState<TagTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<TagColor>('#FFFFFF')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<TagColor>('#FFFFFF')
  const [deleteHoverId, setDeleteHoverId] = useState<string | null>(null)

  function loadTemplates() {
    setIsLoading(true)
    setErrorText(null)
    supabase
      .from('tag_templates')
      .select('id, name, color, order, created_at')
      .order('order', { ascending: true })
      .then(({ data, error }) => {
        setIsLoading(false)
        if (error) {
          setErrorText(error.message)
          setTemplates([])
          return
        }
        setTemplates((data ?? []) as TagTemplate[])
      })
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  async function addTag() {
    const name = newName.trim()
    if (!name || name.length > 20) return
    const { error } = await supabase
      .from('tag_templates')
      .insert({ name, color: newColor, order: templates.length })
    if (error) {
      setErrorText(error.message)
      return
    }
    setNewName('')
    setNewColor('#FFFFFF')
    loadTemplates()
  }

  async function updateTag(id: string, name: string, color: string) {
    const trimmed = name.trim()
    if (!trimmed || trimmed.length > 20) return
    const { error } = await supabase
      .from('tag_templates')
      .update({ name: trimmed, color })
      .eq('id', id)
    if (error) {
      setErrorText(error.message)
      return
    }
    setEditingId(null)
    loadTemplates()
  }

  async function deleteTag(id: string) {
    const { error } = await supabase.from('tag_templates').delete().eq('id', id)
    if (error) {
      setErrorText(error.message)
      return
    }
    setEditingId(null)
    loadTemplates()
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-6">
      <div>
        <h1 className="text-xl">Теги</h1>
        <div className="mt-1 text-sm text-white/60">
          Создавайте и редактируйте теги. В задаче можно добавить тег кнопкой «Добавить тег».
        </div>
      </div>

      {errorText ? (
        <div className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorText}
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <div className="text-xs text-white/50">Название (до 20 символов)</div>
            <input
              value={newName}
              maxLength={20}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              className="mt-1 w-[200px] rounded-xl px-3 py-2 text-sm text-white outline-none"
              placeholder="Например: Срочно"
            />
          </label>
          <div className="flex items-center gap-2">
            <div className="text-xs text-white/50">Цвет</div>
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={cn(
                  'h-8 w-8 rounded-full',
                  newColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : '',
                )}
                style={{ backgroundColor: c }}
                title={c}
                aria-label={`Цвет ${c}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addTag}
            disabled={!newName.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-black disabled:opacity-40"
          >
            <Plus size={16} />
            Добавить тег
          </button>
        </div>

        {isLoading ? (
          <div className="py-6 text-sm text-white/50">Загрузка…</div>
        ) : templates.length === 0 ? (
          <div className="py-6 text-sm text-white/50">Нет тегов. Добавьте первый выше.</div>
        ) : (
          <ul className="space-y-2">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-xl py-2"
              >
                {editingId === t.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      maxLength={20}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateTag(t.id, editName, editColor)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="min-w-0 flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none bg-[#1a1a1a]"
                    />
                    <div className="flex items-center gap-1">
                      {TAG_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={cn(
                            'h-6 w-6 rounded-full',
                            editColor === c ? 'ring-2 ring-white' : '',
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateTag(t.id, editName, editColor)}
                      className="rounded-xl px-3 py-1.5 text-sm text-white/80 hover:text-white"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-xl px-2 py-1.5 text-sm text-white/50 hover:text-white"
                    >
                      Отмена
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex min-w-0 flex-1 items-center gap-2" style={{ color: t.color }}>
                      {t.name === 'Срочно' ? (
                        <img src={molniaredUrl} alt="" className="h-3 w-3 shrink-0" />
                      ) : (
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                      )}
                      <span className="truncate text-sm">{t.name}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(t.id)
                          setEditName(t.name)
                          setEditColor(t.color as TagColor)
                        }}
                        className="rounded-xl px-2 py-1.5 text-xs text-white/60 hover:text-white"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onMouseEnter={() => setDeleteHoverId(t.id)}
                        onMouseLeave={() => setDeleteHoverId(null)}
                        onClick={() => deleteTag(t.id)}
                        className="p-1.5"
                        aria-label="Удалить"
                        title="Удалить"
                      >
                        <img
                          src={deleteHoverId === t.id ? deleteNavUrl : deleteUrl}
                          alt=""
                          className="h-[18px] w-[18px]"
                        />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

