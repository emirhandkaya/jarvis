import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'
import type { Checkin } from '../types'

const defined = <T extends object>(o: T): Partial<T> =>
  Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined)) as Partial<T>

export async function saveMorning(
  date: string,
  v: { sleepHours?: number; energy: number; mood: number; priorities: string[] },
): Promise<void> {
  const now = new Date().toISOString()
  await db.transaction('rw', db.checkins, async () => {
    const cur = await db.checkins.get(date)
    await db.checkins.put({ ...cur, ...defined(v), priorities: v.priorities, date, createdAt: cur?.createdAt ?? now, updatedAt: now })
  })
}

export async function saveEvening(
  date: string,
  v: { wins?: string; learned?: string; tomorrowFirst?: string },
): Promise<void> {
  const now = new Date().toISOString()
  await db.transaction('rw', db.checkins, async () => {
    const cur = await db.checkins.get(date)
    const base: Checkin = cur ?? { date, priorities: [], createdAt: now, updatedAt: now }
    await db.checkins.put({ ...base, ...defined(v), updatedAt: now })
  })
}

export function useCheckin(date: string): Checkin | undefined {
  return useLiveQuery(() => db.checkins.get(date), [date])
}
