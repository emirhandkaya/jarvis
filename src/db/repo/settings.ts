import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'
import type { ActiveTimer } from '../../logic/timer'

export const DEFAULT_SETTINGS = {
  wakeTime: '07:00',
  sleepTime: '23:00',
  pomodoro: { work: 25, short: 5, long: 15, longEvery: 4 },
  cardOrder: [] as string[],
  hiddenCards: [] as string[],
  lastBackupAt: null as string | null,
  activeTimer: null as ActiveTimer | null,
  lastFocusCourseId: null as string | null,
  weeklyWorkoutTarget: 3,
  restSec: 90,
}
export type Settings = typeof DEFAULT_SETTINGS

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray()
  const stored = Object.fromEntries(rows.map(r => [r.key, r.value]))
  const merged = { ...DEFAULT_SETTINGS, ...stored } as Settings
  merged.pomodoro = { ...DEFAULT_SETTINGS.pomodoro, ...(stored.pomodoro as object | undefined) }
  return merged
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await db.settings.put({ key, value })
}

export function useSettings(): Settings | undefined {
  return useLiveQuery(() => getSettings(), [])
}
