import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { useToast } from '../../contexts/ToastContext'
import { cn } from '../../utils/cn'
import { SidebarToggle } from './SidebarToggle'
import logoUrl from '../../assets/logo.svg'
import logoMinUrl from '../../assets/logo-min.svg'
import tagsUrl from '../../assets/tags.svg'
import analyticsUrl from '../../assets/analytics.svg'
import projectsUrl from '../../assets/projects.svg'
import teamUrl from '../../assets/team.svg'
import exitUrl from '../../assets/exit.svg'

function SidebarNavItem({
  to,
  iconSrc,
  label,
  collapsed,
}: {
  to: string
  iconSrc: string
  label: string
  collapsed: boolean
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white',
          isActive && 'bg-white/5 text-white',
          collapsed && 'justify-center px-2',
        )
      }
      title={collapsed ? label : undefined}
    >
      <img src={iconSrc} alt="" className="h-[18px] w-[18px] shrink-0" />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </NavLink>
  )
}

export function Sidebar() {
  const { signOut } = useAuth()
  const { addToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const {
    employees,
    isLoadingEmployees,
    employeesError,
    selectedEmployeeId,
    setSelectedEmployeeId,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useApp()

  const visibleEmployees = employees.filter((e) => !e.is_hidden)
  const isInternalSection = location.pathname !== '/' && location.pathname !== ''
  const onAllClick = () => {
    setSelectedEmployeeId(null)
    if (isInternalSection) navigate('/')
  }

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-[#2f2f2f] bg-black',
        sidebarCollapsed ? 'w-[76px]' : 'w-[280px]',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-4',
          sidebarCollapsed ? 'justify-center' : 'justify-between',
        )}
      >
        <Link
          to="/"
          onClick={() => setSelectedEmployeeId(null)}
          className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}
        >
          <img
            src={sidebarCollapsed ? logoMinUrl : logoUrl}
            alt="Task tracker"
            className={cn('h-6 w-auto', sidebarCollapsed ? 'max-w-[60px]' : 'max-w-[124px]')}
          />
        </Link>

        {!sidebarCollapsed ? (
          <SidebarToggle
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        ) : null}
      </div>

      {sidebarCollapsed ? (
        <div className="flex justify-center pb-2">
          <SidebarToggle
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>
      ) : null}

      <div className={cn('flex-1 min-h-0 overflow-y-auto px-3', sidebarCollapsed && 'px-2')}>
        <button
          type="button"
          onClick={onAllClick}
          className={cn(
            'mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-white/5',
            selectedEmployeeId === null ? 'bg-white/10 text-white' : 'text-white/70',
            sidebarCollapsed && 'justify-center px-2',
          )}
          title={sidebarCollapsed ? 'Все' : undefined}
        >
          <span className={cn('truncate', sidebarCollapsed && 'text-xs')}>
            Все
          </span>
        </button>

        <div className={cn('space-y-1', sidebarCollapsed && 'space-y-2')}>
          {employeesError ? (
            <div
              className={cn(
                'px-3 py-2 text-xs text-red-200/90',
                sidebarCollapsed && 'text-center',
              )}
            >
              Ошибка загрузки
            </div>
          ) : isLoadingEmployees ? (
            <div className={cn('px-3 py-2 text-xs text-white/40', sidebarCollapsed && 'text-center')}>
              Загрузка…
            </div>
          ) : visibleEmployees.length === 0 ? (
            <div className={cn('px-3 py-2 text-xs text-white/40', sidebarCollapsed && 'text-center')}>
              Нет сотрудников
            </div>
          ) : (
            visibleEmployees.map((e) => {
              const active = selectedEmployeeId === e.id
              const initial = (e.name.trim()[0] ?? '?').toUpperCase()
              const avatarUrl = e.avatar_url ?? null
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setSelectedEmployeeId(e.id)
                    if (isInternalSection) navigate('/')
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-white/5',
                    active ? 'bg-white/10 text-white' : 'text-white/70',
                    sidebarCollapsed && 'justify-center px-2',
                  )}
                  title={sidebarCollapsed ? e.name : undefined}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs text-white/70">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className={active ? 'text-white' : ''}>{initial}</span>
                    )}
                  </span>
                  {!sidebarCollapsed ? <span className="truncate">{e.name}</span> : null}
                </button>
              )
            })
          )}
        </div>
      </div>

      <div className="mt-auto px-3 pb-4 pt-4">
        <nav className="space-y-1">
          <SidebarNavItem
            to="/tags"
            iconSrc={tagsUrl}
            label="Теги"
            collapsed={sidebarCollapsed}
          />
          <SidebarNavItem
            to="/analytics"
            iconSrc={analyticsUrl}
            label="Аналитика"
            collapsed={sidebarCollapsed}
          />
          <SidebarNavItem
            to="/projects"
            iconSrc={projectsUrl}
            label="Проекты"
            collapsed={sidebarCollapsed}
          />
          <SidebarNavItem
            to="/team"
            iconSrc={teamUrl}
            label="Команда"
            collapsed={sidebarCollapsed}
          />
        </nav>

        <button
          type="button"
          onClick={() => {
            ;(async () => {
              try {
                await signOut()
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Ошибка выхода'
                addToast(message, 'error')
              }
            })()
          }}
          className={cn(
            'mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white',
            sidebarCollapsed && 'justify-center px-2',
          )}
          title={sidebarCollapsed ? 'Выйти' : undefined}
        >
          <img src={exitUrl} alt="" className="h-[18px] w-[18px] shrink-0" />
          {!sidebarCollapsed ? <span className="truncate">Выйти</span> : null}
        </button>
      </div>
    </aside>
  )
}

