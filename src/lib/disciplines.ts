import type { Discipline } from './types'

export const DISCIPLINES: { id: Discipline; name: string }[] = [
  { id: 'karate', name: 'Karate' },
  { id: 'boxing', name: 'Boxing' },
  { id: 'taekwondo', name: 'Taekwondo' },
]

export function disciplineName(id: string): string {
  return DISCIPLINES.find((d) => d.id === id)?.name ?? id
}

export function disciplineList(ids: readonly string[]): string {
  return DISCIPLINES.filter((d) => ids.includes(d.id))
    .map((d) => d.name)
    .join(' · ')
}
