import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'
import { weekStart } from '../../logic/dates'
import { reduceTargets } from '../../logic/review'
import { getSettings, setSetting } from './settings'
import type { Review } from '../types'

export type ReviewFields = Pick<Review, 'wentWell' | 'toImprove' | 'nextFocus' | 'goalIds'>

export async function saveReview(ws: string, fields: ReviewFields): Promise<void> {
  const now = new Date().toISOString()
  await db.transaction('rw', db.reviews, async () => {
    const cur = await db.reviews.get(ws)
    await db.reviews.put({ ...fields, weekStart: ws, createdAt: cur?.createdAt ?? now, updatedAt: now })
  })
}

export const getReview = (ws: string): Promise<Review | undefined> => db.reviews.get(ws)

export function useReview(ws: string): Review | undefined {
  return useLiveQuery(() => db.reviews.get(ws), [ws])
}

export async function isWeekReviewed(date: string): Promise<boolean> {
  return (await db.reviews.get(weekStart(date))) !== undefined
}

export function useWeekReviewed(date: string): boolean | undefined {
  return useLiveQuery(() => isWeekReviewed(date), [date])
}

export function useReviewWeekStarts(): string[] | undefined {
  return useLiveQuery(() => db.reviews.toCollection().primaryKeys(), [])
}

export async function applyRestart(): Promise<void> {
  const [courses, settings] = await Promise.all([db.courses.toArray(), getSettings()])
  const r = reduceTargets(courses, settings.weeklyWorkoutTarget)
  const now = new Date().toISOString()
  await db.transaction('rw', db.courses, async () => {
    for (const c of r.courses) {
      const cur = courses.find(x => x.id === c.id)!
      await db.courses.put({ ...cur, weeklyTargetMin: c.weeklyTargetMin, updatedAt: now })
    }
  })
  await setSetting('weeklyWorkoutTarget', r.workoutTarget)
}
