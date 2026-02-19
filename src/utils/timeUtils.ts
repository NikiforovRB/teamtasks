export function formatMinutes(totalMinutes: number) {
  const m = Math.max(0, Math.floor(totalMinutes))
  const h = Math.floor(m / 60)
  const mm = m % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h}ч`)
  parts.push(`${mm}м`)
  return parts.join(' ')
}

export function clampMinutes(totalMinutes: number) {
  if (!Number.isFinite(totalMinutes)) return 0
  return Math.max(0, Math.floor(totalMinutes))
}

