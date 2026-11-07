import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'
import { newRecord, touch } from '../meta'
import type { Task } from '../types'

type TaskOpts = Partial<Pick<Task, 'tag' | 'priority' | 'dueDate' | 'plannedDate' | 'estimateMin' | 'energy' | 'goalId'>>

export async function addTask(title: string, opts: TaskOpts = {}): Promise<Task | null> {
  const clean = title.trim()
  if (!clean) return null
  const task = newRecord<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>({
    tag: 'kisisel', priority: 2, energy: 'low', ...opts, title: clean,
  }) as Task
  await db.tasks.add(task)
  return task
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const cur = await db.tasks.get(id)
  if (!cur) return
  await db.tasks.put(touch({ ...cur, ...patch, id }))
}

export async function toggleDone(id: string): Promise<void> {
  const cur = await db.tasks.get(id)
  if (!cur) return
  const next = { ...cur }
  if (cur.doneAt) delete next.doneAt
  else next.doneAt = new Date().toISOString()
  await db.tasks.put(touch(next))
}

export async function planFor(id: string, date: string | null): Promise<void> {
  const cur = await db.tasks.get(id)
  if (!cur) return
  const next = { ...cur }
  if (date === null) delete next.plannedDate
  else next.plannedDate = date
  await db.tasks.put(touch(next))
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id)
}

export function useTasks(): Task[] | undefined {
  return useLiveQuery(() => db.tasks.toArray(), [])
}
