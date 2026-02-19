export type Id = string

export type TaskStatus = 'planned' | 'completed'

export type Employee = {
  id: Id
  name: string
  is_hidden: boolean
  order: number
  avatar_url?: string | null
  created_at: string
}

export type Project = {
  id: Id
  name: string
  is_hidden: boolean
  order: number
  created_at: string
}

export type Task = {
  id: Id
  project_id: Id | null
  employee_id: Id | null
  short_description: string
  long_description: string | null
  date: string // YYYY-MM-DD
  status: TaskStatus
  time_spent_minutes: number | null
  order: number
  created_at: string
  updated_at: string
}

export type Tag = {
  id: Id
  task_id: Id
  name: string
  color: string // hex
  created_at: string
}

export type TagTemplate = {
  id: Id
  name: string
  color: string
  order: number
  created_at: string
}

