import type { WorkoutSet } from '../../db/types'

export const fmtKg = (n: number): string => String(Number(n.toFixed(2)))
export const fmtSets = (sets: Pick<WorkoutSet, 'weightKg' | 'reps'>[]): string =>
  sets.map(s => `${fmtKg(s.weightKg)}×${s.reps}`).join(', ')
export const fmtDate = (d: string): string =>
  new Date(`${d}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
