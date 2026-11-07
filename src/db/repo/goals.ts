import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'
import { newRecord, touch } from '../meta'
import { addDays, todayStr } from '../../logic/dates'
import type { Goal } from '../types'

export { goalChain } from '../../logic/tasks'

export async function addGoal(kind: Goal['kind'], title: string, parentId?: string, start?: string, end?: string): Promise<Goal> {
  const s = start ?? (kind === 'identity' ? undefined : todayStr())
  const e = end ?? (kind === 'cycle' && s ? addDays(s, 84) : undefined)
  const goal = newRecord({ kind, title: title.trim(), parentId, start: s, end: e, status: 'active' }) as Goal
  await db.goals.add(goal)
  return goal
}

export async function archiveGoal(id: string): Promise<void> {
  const cur = await db.goals.get(id)
  if (cur) await db.goals.put(touch({ ...cur, status: 'archived' }))
}

export function useGoals(): Goal[] | undefined {
  return useLiveQuery(() => db.goals.toArray(), [])
}
