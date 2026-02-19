import { useState } from 'react'
import menuUrl from '../../assets/menu.svg'
import menuNavUrl from '../../assets/menu-nav.svg'

export function SidebarToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const [hover, setHover] = useState(false)
  const src = hover ? menuNavUrl : menuUrl

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex h-7 w-7 items-center justify-center text-white/70 hover:text-white"
      aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
      title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
    >
      <img src={src} alt="" className="h-4 w-4" />
    </button>
  )
}
