import type { Tag } from '../../types'
import molniaredUrl from '../../assets/molniared.svg'

export function TagBadge({ tag }: { tag: Pick<Tag, 'name' | 'color'> }) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-xs"
      style={{ color: tag.color }}
    >
      {tag.name === 'Срочно' ? (
        <img src={molniaredUrl} alt="" className="h-2.5 w-2.5 shrink-0" />
      ) : (
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
      )}
      <span className="max-w-[180px] truncate">{tag.name}</span>
    </div>
  )
}

