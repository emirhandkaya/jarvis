import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'
import { newRecord, touch } from '../meta'
import type { Habit, HabitLog, HabitSchedule } from '../types'
import { jokerAvailable } from '../../logic/habits'

export async function addHabit(
  name: string,
  opts: { ifThen?: string; minVersion?: string; schedule: HabitSchedule },
): Promise<Habit | null> {
  const n = name.trim()
  if (!n) return null
  const h: Habit = newRecord({
    name: n,
    ifThen: opts.ifThen?.trim() ?? '',
    minVersion: opts.minVersion?.trim() ?? '',
    schedule: opts.schedule,
    archived: false,
  })
  await db.habits.add(h)
  return h
}

export async function updateHabit(id: string, patch: Partial<Omit<Habit, 'id' | 'createdAt'>>): Promise<void> {
  const cur = await db.habits.get(id)
  if (cur) await db.habits.put(touch({ ...cur, ...patch }))
}

export const archiveHabit = (id: string) => updateHabit(id, { archived: true })

export async function setHabitStatus(
  habitId: string,
  date: string,
  status: HabitLog['status'] | null,
): Promise<'ok' | 'joker-limit'> {
  return db.transaction('rw', db.habitLogs, async () => {
    const all = await db.habitLogs.filter(l => l.habitId === habitId).toArray()
    const existing = all.find(l => l.date === date)
    if (status === null) {
      if (existing) await db.habitLogs.delete(existing.id)
      return 'ok' as const
    }
    if (status === 'joker' && !jokerAvailable(all.filter(l => l.date !== date), date)) return 'joker-limit' as const
    if (existing) await db.habitLogs.put(touch({ ...existing, status }))
    else await db.habitLogs.add(newRecord({ habitId, date, status }))
    return 'ok' as const
  })
}

export function useHabits(): Habit[] | undefined {
  return useLiveQuery(async () => (await db.habits.toArray()).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [])
}

export function useHabitLogs(habitId?: string): HabitLog[] | undefined {
  return useLiveQuery(
    () => (habitId ? db.habitLogs.filter(l => l.habitId === habitId).toArray() : db.habitLogs.toArray()),
    [habitId],
  )
}
