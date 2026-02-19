import { addDays } from 'date-fns'
import { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '../services/supabase'
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

export function AnalyticsPage() {
  const { projects, employees } = useApp()
  const today = useMemo(() => new Date(), [])
  const [startDate, setStartDate] = useState(() => toIsoDate(addDays(today, -30)))
  const [endDate, setEndDate] = useState(() => toIsoDate(today))
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null)
  const [filterEmployeeId, setFilterEmployeeId] = useState<string | null>(null)
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('desc')
  const startInputRef = useRef<HTMLInputElement>(null)
  const endInputRef = useRef<HTMLInputElement>(null)

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
              onChange={(e) => setStartDate(e.target.value)}
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
              onChange={(e) => setEndDate(e.target.value)}
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
              onChange={(e) => setFilterProjectId(e.target.value || null)}
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
              onChange={(e) => setFilterEmployeeId(e.target.value || null)}
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs text-white/50">
              <tr className="border-b border-[#2f2f2f]">
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setDateSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                    className="hover:text-white/80"
                    title={dateSortOrder === 'asc' ? 'По возрастанию (нажмите для убывания)' : 'По убыванию (нажмите для возрастания)'}
                  >
                    Дата {dateSortOrder === 'desc' ? '↓' : '↑'}
                  </button>
                </th>
                <th className="px-4 py-3">Проект</th>
                <th className="px-4 py-3">Сотрудник</th>
                <th className="px-4 py-3">Затраченное время</th>
                <th className="px-4 py-3">Короткое описание</th>
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
                    <td className="px-4 py-3 text-white/80">{r.shortDescription}</td>
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
    </div>
  )
}
