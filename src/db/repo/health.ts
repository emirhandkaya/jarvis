import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'
import type { HealthDay } from '../types'
import type { HealthPatch } from '../../logic/healthImport'

export async function upsertHealth(days: HealthPatch[], source: string): Promise<number> {
  const now = new Date().toISOString()
  await db.transaction('rw', db.health, async () => {
    for (const patch of days) {
      const cur = await db.health.get(patch.date)
      const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
      await db.health.put({
        ...cur, ...defined, date: patch.date, source, createdAt: cur?.createdAt ?? now, updatedAt: now,
      } as HealthDay)
    }
  })
  return days.length
}

export function useHealth(date: string): HealthDay | undefined {
  return useLiveQuery(() => db.health.get(date), [date])
}

/** Son n kayıt, eskiden yeniye. */
export async function recentHealth(n: number): Promise<HealthDay[]> {
  return (await db.health.orderBy('date').reverse().limit(n).toArray()).reverse()
}
