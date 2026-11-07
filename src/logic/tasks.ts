import { todayStr } from './dates'
import type { Task, Goal } from '../db/types'

const byPriority = (a: Task, b: Task) =>
  a.priority - b.priority || a.createdAt.localeCompare(b.createdAt)

export function todayView(tasks: Task[], today: string): { overdue: Task[]; today: Task[]; done: Task[] } {
  const overdue: Task[] = []
  const todays: Task[] = []
  const done: Task[] = []
  for (const t of tasks) {
    if (t.doneAt) {
      if (todayStr(new Date(t.doneAt)) === today) done.push(t)
      continue
    }
    if ((t.plannedDate && t.plannedDate < today) || (t.dueDate && t.dueDate < today)) overdue.push(t)
    else if (t.plannedDate === today || t.dueDate === today) todays.push(t)
  }
  return { overdue: overdue.sort(byPriority), today: todays.sort(byPriority), done: done.sort(byPriority) }
}

export function goalChain(goals: Goal[], id: string): Goal[] {
  const byId = new Map(goals.map(g => [g.id, g]))
  const chain: Goal[] = []
  const seen = new Set<string>()
  let cur = byId.get(id)
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    chain.unshift(cur)
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
  }
  return chain
}
