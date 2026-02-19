export const TAG_COLORS = [
  '#FFFFFF',
  '#F33737',
  '#6F6F6F',
  '#5A86EE',
  '#15C466',
  '#EBE400',
  '#D86311',
  '#762A82',
] as const

export type TagColor = (typeof TAG_COLORS)[number]

export const TAG_PRESETS: Array<{ name: string; color: TagColor }> = [
  { name: 'Срочно', color: '#F33737' },
  { name: 'Важно', color: '#EBE400' },
  { name: 'Обычное', color: '#6F6F6F' },
]

