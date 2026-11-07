import type { Exercise, WorkoutSet } from '../db/types'
import { diffDays } from './dates'

export interface Suggestion { weightKg: number; reps: number; reason: 'artir' | 'tekrar' | 'hafiflet' }

type SetLike = Pick<WorkoutSet, 'weightKg' | 'reps'>

export function suggestNext(ex: Exercise, last: SetLike[], prev: SetLike[]): Suggestion | null {
  if (!last.length) return null
  const base = Math.max(...last.map(s => s.weightKg))
  const below = (sets: SetLike[]) => sets.some(s => s.reps < ex.repMin)
  if (prev.length && below(last) && below(prev)) {
    return { weightKg: Math.floor((base * 0.9) / 0.5) * 0.5, reps: ex.repMin, reason: 'hafiflet' }
  }
  if (last.every(s => s.reps >= ex.repMax)) {
    return { weightKg: base + ex.incrementKg, reps: ex.repMin, reason: 'artir' }
  }
  return { weightKg: base, reps: Math.min(ex.repMax, Math.min(...last.map(s => s.reps)) + 1), reason: 'tekrar' }
}

export function deloadReason(
  lastDeload: string | undefined,
  firstWorkout: string | undefined,
  today: string,
  recentEnergy: number[],
): 'zaman' | 'yorgunluk' | null {
  if (recentEnergy.length >= 3) {
    const l3 = recentEnergy.slice(-3)
    if (l3.reduce((a, b) => a + b, 0) / 3 <= 2) return 'yorgunluk'
  }
  const ref = lastDeload ?? firstWorkout
  if (ref && diffDays(ref, today) >= 42) return 'zaman'
  return null
}

export const deloadSets = (n: number): number => Math.max(1, Math.ceil(n / 2))

export const setVolume = (sets: SetLike[]): number => sets.reduce((a, s) => a + s.weightKg * s.reps, 0)
