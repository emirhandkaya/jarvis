import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'
import type { StatsInput } from '../../logic/stats'

export async function loadStatsInput(): Promise<StatsInput> {
  const [sessions, courses, workouts, sets, habits, habitLogs, checkins, health, tasks] = await Promise.all([
    db.focusSessions.toArray(), db.courses.toArray(), db.workouts.toArray(), db.sets.toArray(),
    db.habits.toArray(), db.habitLogs.toArray(), db.checkins.toArray(), db.health.toArray(), db.tasks.toArray(),
  ])
  return { sessions, courses, workouts, sets, habits, habitLogs, checkins, health, tasks }
}

export function useStatsInput(): StatsInput | undefined {
  return useLiveQuery(() => loadStatsInput(), [])
}
