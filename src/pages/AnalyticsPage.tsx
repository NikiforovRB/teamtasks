import { addDays } from 'date-fns'
import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { formatMinutes } from '../utils/timeUtils'
import {
  formatDateModal,
  formatDateAnalyticsInput,
  toIsoDate,
} from '../utils/dateUtils'

type AnalyticsRow = {
  id: string
  date: string
  short_description: string
  time_spent_minutes: number
  project_id: string | null
  employee_id: string | null
  projects: { name: string } | { name: string }[] | null
  employees: { name: string } | { name: string }[] | null
}

function pickJoinedName(joined: AnalyticsRow['projects'] | AnalyticsRow['employees']) {
  if (!joined) return null
  if (Array.isArray(joined)) return joined[0]?.name ?? null
  return joined.name ?? null
}

const todayIso = toIsoDate(new Date())
const defaultStart = toIsoDate(addDays(new Date(), -30))

export function AnalyticsPage() {
  const { user } = useAuth()
  const { projects, employees } = useApp()
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(todayIso)
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null)
  const [filterEmployeeId, setFilterEmployeeId] = useState<string | null>(null)
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('desc')
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const startInputRef = useRef<HTMLInputElement>(null)
  const endInputRef = useRef<HTMLInputElement>(null)

  const savePreferences = useCallback(
    async (start: string, end: string, projectId: string | null, employeeId: string | null) => {
      if (!user?.id) return
      await supabase.from('user_analytics_preferences').upsert(
        {
          user_id: user.id,
          start_date: start,
          end_date: end,
          project_id: projectId,
          employee_id: employeeId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
    },
    [user?.id],
  )

  useEffect(() => {
    if (!user?.id) return
    let mounted = true
    supabase
      .from('user_analytics_preferences')
      .select('start_date, end_date, project_id, employee_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!mounted || error || !data) {
          setPreferencesLoaded(true)
          return
        }
        const row = data as { start_date: string; end_date: string; project_id: string | null; employee_id: string | null }
        setStartDate(row.start_date)
        setEndDate(row.end_date)
        setFilterProjectId(row.project_id)
        setFilterEmployeeId(row.employee_id)
        setPreferencesLoaded(true)
      })
    return () => {
      mounted = false
    }
  }, [user?.id])

  const [rows, setRows] = useState<
    Array<{
      id: string
      date: string
      projectId: string | null
      employeeId: string | null
      projectName: string | null
      employeeName: string | null
      timeSpentMinutes: number
      shortDescription: string
    }>
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)

  const invalidRange = startDate > endDate

  const filteredAndSortedRows = useMemo(() => {
    let list = rows.filter((r) => {
      if (filterProjectId != null && r.projectId !== filterProjectId) return false
      if (filterEmployeeId != null && r.employeeId !== filterEmployeeId) return false
      return true
    })
    list = [...list].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date)
      return dateSortOrder === 'asc' ? cmp : -cmp
    })
    return list
  }, [rows, filterProjectId, filterEmployeeId, dateSortOrder])

  const totalMinutes = useMemo(
    () => filteredAndSortedRows.reduce((acc, r) => acc + r.timeSpentMinutes, 0),
    [filteredAndSortedRows],
  )

  const chartData = useMemo(() => {
    const byProject = new Map<string | null, { name: string; minutes: number }>()
    for (const r of filteredAndSortedRows) {
      const key = r.projectId
      const name = r.projectName?.trim() ? r.projectName : 'Без проекта'
      const prev = byProject.get(key)
      if (prev) {
        prev.minutes += r.timeSpentMinutes
      } else {
        byProject.set(key, { name, minutes: r.timeSpentMinutes })
      }
    }
    const list = Array.from(byProject.entries()).map(([id, { name, minutes }]) => ({
      projectId: id,
      projectName: name,
      totalMinutes: minutes,
    }))
    list.sort((a, b) => b.totalMinutes - a.totalMinutes)
    return list
  }, [filteredAndSortedRows])

  const maxChartMinutes = chartData[0]?.totalMinutes ?? 1

  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    setErrorText(null)

    if (invalidRange) {
      setRows([])
      setErrorText('Проверьте диапазон дат: дата начала позже даты конца.')
      setIsLoading(false)
      return () => {
        mounted = false
      }
    }

    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select(
            `
              id,
              date,
              project_id,
              employee_id,
              short_description,
              time_spent_minutes,
              projects(name),
              employees(name)
            `,
          )
          .eq('status', 'completed')
          .not('time_spent_minutes', 'is', null)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false })

        if (!mounted) return
        if (error) {
          setErrorText(error.message)
          setRows([])
          return
        }

        const mapped = ((data ?? []) as unknown[]).map((x) => {
          const r = x as AnalyticsRow
          return {
            id: r.id,
            date: r.date,
            projectId: r.project_id,
            employeeId: r.employee_id,
            projectName: pickJoinedName(r.projects),
            employeeName: pickJoinedName(r.employees),
            timeSpentMinutes: r.time_spent_minutes ?? 0,
            shortDescription: r.short_description,
          }
        })
        setRows(mapped)
      } catch (err) {
        if (!mounted) return
        const message = err instanceof Error ? err.message : 'Ошибка загрузки'
        setErrorText(message)
        setRows([])
      } finally {
        if (!mounted) return
        setIsLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [endDate, invalidRange, startDate])

  const projectOptions = useMemo(
    () => projects.filter((p) => !p.is_hidden),
    [projects],
  )
  const employeeOptions = useMemo(
    () => employees.filter((e) => !e.is_hidden),
    [employees],
  )

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl">Аналитика</h1>
          <div className="mt-1 text-sm text-white/60">
            Показаны только выполненные задачи с введённым временем.
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="block">
            <div className="text-xs text-white/50">Дата начала</div>
            <input
              ref={startInputRef}
              type="date"
              value={startDate}
              onChange={(e) => {
              const v = e.target.value
              setStartDate(v)
              if (preferencesLoaded && user?.id) void savePreferences(v, endDate, filterProjectId, filterEmployeeId)
            }}
              className="absolute h-0 w-0 opacity-0 pointer-events-none"
              aria-hidden
            />
            <button
              type="button"
              onClick={() => startInputRef.current?.showPicker?.()}
              className="mt-1 rounded-xl px-3 py-2 text-left text-sm text-white outline-none bg-[#1a1a1a] hover:bg-white/10 min-w-[160px]"
            >
              {formatDateAnalyticsInput(startDate)}
            </button>
          </div>
          <div className="block">
            <div className="text-xs text-white/50">Дата конца</div>
            <input
              ref={endInputRef}
              type="date"
              value={endDate}
              onChange={(e) => {
              const v = e.target.value
              setEndDate(v)
              if (preferencesLoaded && user?.id) void savePreferences(startDate, v, filterProjectId, filterEmployeeId)
            }}
              className="absolute h-0 w-0 opacity-0 pointer-events-none"
              aria-hidden
            />
            <button
              type="button"
              onClick={() => endInputRef.current?.showPicker?.()}
              className="mt-1 rounded-xl px-3 py-2 text-left text-sm text-white outline-none bg-[#1a1a1a] hover:bg-white/10 min-w-[160px]"
            >
              {formatDateAnalyticsInput(endDate)}
            </button>
          </div>
          <div className="block">
            <div className="text-xs text-white/50">Проект</div>
            <select
              value={filterProjectId ?? ''}
              onChange={(e) => {
              const v = e.target.value || null
              setFilterProjectId(v)
              if (preferencesLoaded && user?.id) void savePreferences(startDate, endDate, v, filterEmployeeId)
            }}
              className="mt-1 rounded-xl px-3 py-2 text-sm text-white outline-none bg-[#1a1a1a] min-w-[160px]"
            >
              <option value="">Все проекты</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="block">
            <div className="text-xs text-white/50">Сотрудник</div>
            <select
              value={filterEmployeeId ?? ''}
              onChange={(e) => {
              const v = e.target.value || null
              setFilterEmployeeId(v)
              if (preferencesLoaded && user?.id) void savePreferences(startDate, endDate, filterProjectId, v)
            }}
              className="mt-1 rounded-xl px-3 py-2 text-sm text-white outline-none bg-[#1a1a1a] min-w-[160px]"
            >
              <option value="">Все сотрудники</option>
              {employeeOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {errorText ? (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorText}
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl">
        <div className="max-h-[min(864px,85vh)] overflow-auto">
          <table className="min-w-full table-fixed text-left text-sm">
            <colgroup>
              <col style={{ width: '200px' }} />
              <col style={{ width: '220px' }} />
              <col />
              <col />
              <col style={{ width: '28%' }} />
            </colgroup>
            <thead className="text-xs text-white/50">
              <tr className="border-b border-[#2f2f2f]">
                <th className="sticky top-0 z-10 border-b border-[#2f2f2f] bg-black px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setDateSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                    className="hover:text-white/80"
                    title={dateSortOrder === 'asc' ? 'По возрастанию (нажмите для убывания)' : 'По убыванию (нажмите для возрастания)'}
                  >
                    Дата {dateSortOrder === 'desc' ? '↓' : '↑'}
                  </button>
                </th>
                <th className="sticky top-0 z-10 border-b border-[#2f2f2f] bg-black px-4 py-3">Проект</th>
                <th className="sticky top-0 z-10 border-b border-[#2f2f2f] bg-black px-4 py-3">Сотрудник</th>
                <th className="sticky top-0 z-10 border-b border-[#2f2f2f] bg-black px-4 py-3">Затраченное время</th>
                <th className="sticky top-0 z-10 border-b border-[#2f2f2f] bg-black px-4 py-3">Короткое описание</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr className="border-b border-[#2f2f2f]">
                  <td className="px-4 py-4 text-white/60" colSpan={5}>
                    Загрузка…
                  </td>
                </tr>
              ) : filteredAndSortedRows.length === 0 ? (
                <tr className="border-b border-[#2f2f2f]">
                  <td className="px-4 py-8 text-white/50" colSpan={5}>
                    Нет данных за выбранный период
                  </td>
                </tr>
              ) : (
                filteredAndSortedRows.map((r) => (
                  <tr key={r.id} className="border-b border-[#2f2f2f] hover:bg-white/[0.06]">
                    <td className="px-4 py-3 text-white/80">
                      {formatDateModal(r.date)}
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {r.projectName ?? 'Проект не выбран'}
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {r.employeeName ?? 'Сотрудник не выбран'}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {formatMinutes(r.timeSpentMinutes)}
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-white/80" title={r.shortDescription}>
                      {r.shortDescription}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 text-sm text-white/70">
          <span className="text-white/50">Суммарно:</span>{' '}
          <span className="text-white">{formatMinutes(totalMinutes)}</span>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-4 text-sm text-white/70">Сравнение по проектам (суммарное время)</h2>
          <div className="space-y-3">
            {chartData.map((item) => {
              const widthPct = maxChartMinutes > 0 ? (item.totalMinutes / maxChartMinutes) * 100 : 0
              return (
                <div key={item.projectId ?? 'null'} className="flex items-center gap-4">
                  <span className="min-w-[140px] max-w-[200px] shrink-0 truncate text-sm text-white/70" title={item.projectName}>
                    {item.projectName}
                  </span>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div
                      className="h-8 rounded-[6px] bg-[#2f2f2f]"
                      style={{ width: `${widthPct}%`, minWidth: item.totalMinutes > 0 ? '4px' : 0 }}
                    />
                    <span className="shrink-0 text-sm text-white/80">
                      {formatMinutes(item.totalMinutes)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
