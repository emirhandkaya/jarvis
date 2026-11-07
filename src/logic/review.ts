import type { Course } from '../db/types'
import { addDays, isSunday, weekStart } from './dates'

export function reviewWeekFor(today: string, existingWeekStarts: string[]): { weekStart: string; mode: 'edit' | 'view' } {
  const cur = weekStart(today)
  if (isSunday(today)) return { weekStart: cur, mode: 'edit' }
  const prev = addDays(cur, -7)
  if (!existingWeekStarts.includes(prev)) return { weekStart: prev, mode: 'edit' }
  return { weekStart: cur, mode: 'view' }
}

export function reduceTargets(courses: Pick<Course, 'id' | 'weeklyTargetMin'>[], workoutTarget: number) {
  return {
    courses: courses.map(c => ({
      id: c.id,
      weeklyTargetMin: Math.max(30, Math.round((c.weeklyTargetMin * 0.7) / 5) * 5),
    })),
    workoutTarget: Math.max(1, workoutTarget - 1),
  }
}
