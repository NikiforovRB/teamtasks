import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TAG_COLORS, TAG_PRESETS, type TagColor } from '../../utils/constants'
import { cn } from '../../utils/cn'

export function TagSelector({
  onAdd,
  disabled,
}: {
  onAdd: (tag: { name: string; color: TagColor }) => void
  disabled?: boolean
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<TagColor>('#FFFFFF')

  const trimmed = name.trim()
  const canAdd = useMemo(
    () => !disabled && trimmed.length > 0 && trimmed.length <= 20,
    [disabled, trimmed.length],
  )

  function submit() {
    if (!canAdd) return
    onAdd({ name: trimmed, color })
    setName('')
    setColor('#FFFFFF')
  }

  return (
    <div className="rounded-xl p-4">
      <div className="text-xs text-white/60">Теги</div>

      <div className="mt-2 grid gap-3">
        <div>
          <div className="text-[11px] text-white/40">Быстрые шаблоны</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {TAG_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                disabled={disabled}
                onClick={() => onAdd(preset)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: preset.color }}
                />
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <div className="text-[11px] text-white/40">Описание тега (до 20 символов)</div>
          <input
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
            placeholder="Например: Срочно"
            disabled={disabled}
          />
        </label>

        <div>
          <div className="text-[11px] text-white/40">Цвет</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {TAG_COLORS.map((c) => {
              const selected = c === color
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  disabled={disabled}
                  className={cn(
                    'h-8 w-8 rounded-full border bg-black/20',
                    selected ? 'border-[2px]' : 'border-white/10',
                  )}
                  style={{
                    borderColor: selected ? c : undefined,
                  }}
                  aria-label={`Цвет ${c}`}
                  title={c}
                >
                  <span className="block h-full w-full rounded-full" style={{ backgroundColor: c }} />
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!canAdd}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-black disabled:opacity-40"
        >
          <Plus size={16} />
          Добавить тег
        </button>
      </div>
    </div>
  )
}

