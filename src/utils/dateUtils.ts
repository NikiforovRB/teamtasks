import { addDays, endOfWeek, format, isSameDay, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'

export function toIsoDate(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

export function getWeekStart(anchor: Date) {
  return startOfWeek(anchor, { weekStartsOn: 1 })
}

export function getWeekEnd(anchor: Date) {
  return endOfWeek(anchor, { weekStartsOn: 1 })
}

export function addWeeks(anchor: Date, weeks: number) {
  return addDays(anchor, weeks * 7)
}

export function formatWeekRange(start: Date, end: Date) {
  return `${format(start, 'd MMMM', { locale: ru })} - ${format(end, 'd MMMM', { locale: ru })}`
}

const WEEKDAY_SHORT: Record<string, string> = {
  пнд: 'пн', втр: 'вт', срд: 'ср', чтв: 'чт', птн: 'пт', суб: 'сб', вск: 'вс',
  пн: 'пн', вт: 'вт', ср: 'ср', чт: 'чт', пт: 'пт', сб: 'сб', вс: 'вс',
}

function formatWeekdayShort(d: Date) {
  const raw = format(d, 'EEE', { locale: ru }).replace('.', '').toLowerCase()
  return WEEKDAY_SHORT[raw] ?? raw
}

export function formatDayHeader(d: Date, today: Date = new Date()) {
  const datePart = format(d, 'd MMMM', { locale: ru })
  const weekday = formatWeekdayShort(d)
  if (isSameDay(d, today)) return `Сегодня ${datePart}, ${weekday}`
  return `${datePart}, ${weekday}`
}

/** For modal date display: "17 февраля, вт" */
export function formatDateModal(dateIso: string) {
  const d = new Date(dateIso + 'T12:00:00')
  const datePart = format(d, 'd MMMM', { locale: ru })
  const weekday = formatWeekdayShort(d)
  return `${datePart}, ${weekday}`
}

/** For analytics date display: "20 января 2026" */
export function formatDateAnalyticsInput(dateIso: string) {
  const d = new Date(dateIso + 'T12:00:00')
  return format(d, 'd MMMM yyyy', { locale: ru })
}

