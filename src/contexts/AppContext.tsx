import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '../services/supabase'
import type { Employee, Project } from '../types'

type AppContextValue = {
  employees: Employee[]
  isLoadingEmployees: boolean
  employeesError: string | null
  reloadEmployees: () => Promise<void>

  projects: Project[]
  isLoadingProjects: boolean
  projectsError: string | null
  reloadProjects: () => Promise<void>

  selectedEmployeeId: string | null
  setSelectedEmployeeId: (id: string | null) => void

  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

const LS_SIDEBAR_COLLAPSED = 'tt.sidebarCollapsed'
const LS_SELECTED_EMPLOYEE_ID = 'tt.selectedEmployeeId'

export function AppProvider({ children }: PropsWithChildren) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)
  const [employeesError, setEmployeesError] = useState<string | null>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)

  const [selectedEmployeeId, setSelectedEmployeeIdState] = useState<string | null>(
    () => {
      const raw = localStorage.getItem(LS_SELECTED_EMPLOYEE_ID)
      return raw && raw !== 'null' ? raw : null
    },
  )

  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => {
    const raw = localStorage.getItem(LS_SIDEBAR_COLLAPSED)
    return raw === '1'
  })

  const reloadEmployees = useCallback(async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    setEmployees((data ?? []) as Employee[])
    setEmployeesError(null)
  }, [])

  const reloadProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    setProjects((data ?? []) as Project[])
    setProjectsError(null)
  }, [])

  useEffect(() => {
    let mounted = true
    setIsLoadingEmployees(true)
    setEmployeesError(null)
    reloadEmployees()
      .catch((err) => {
        if (!mounted) return
        const message = err instanceof Error ? err.message : 'Ошибка загрузки сотрудников'
        setEmployeesError(message)
        setEmployees([])
      })
      .finally(() => {
        if (!mounted) return
        setIsLoadingEmployees(false)
      })
    return () => {
      mounted = false
    }
  }, [reloadEmployees])

  useEffect(() => {
    let mounted = true
    setIsLoadingProjects(true)
    setProjectsError(null)
    reloadProjects()
      .catch((err) => {
        if (!mounted) return
        const message = err instanceof Error ? err.message : 'Ошибка загрузки проектов'
        setProjectsError(message)
        setProjects([])
      })
      .finally(() => {
        if (!mounted) return
        setIsLoadingProjects(false)
      })
    return () => {
      mounted = false
    }
  }, [reloadProjects])

  const setSelectedEmployeeId = useCallback((id: string | null) => {
    setSelectedEmployeeIdState(id)
    localStorage.setItem(LS_SELECTED_EMPLOYEE_ID, id ?? 'null')
  }, [])

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed)
    localStorage.setItem(LS_SIDEBAR_COLLAPSED, collapsed ? '1' : '0')
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      employees,
      isLoadingEmployees,
      employeesError,
      reloadEmployees,
      projects,
      isLoadingProjects,
      projectsError,
      reloadProjects,
      selectedEmployeeId,
      setSelectedEmployeeId,
      sidebarCollapsed,
      setSidebarCollapsed,
    }),
    [
      employees,
      isLoadingEmployees,
      employeesError,
      reloadEmployees,
      projects,
      isLoadingProjects,
      projectsError,
      reloadProjects,
      selectedEmployeeId,
      setSelectedEmployeeId,
      sidebarCollapsed,
      setSidebarCollapsed,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

