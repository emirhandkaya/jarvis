import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'
import { newRecord, touch } from '../meta'
import type { Course } from '../types'

export const COURSE_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6']

export async function addCourse(
  name: string,
  opts: { color?: string; examDate?: string; weeklyTargetMin?: number } = {},
): Promise<Course | null> {
  const clean = name.trim()
  if (!clean) return null
  const count = await db.courses.count()
  const course = newRecord<Omit<Course, 'id' | 'createdAt' | 'updatedAt'>>({
    color: COURSE_COLORS[count % COURSE_COLORS.length],
    weeklyTargetMin: 300,
    ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)),
    name: clean,
  }) as Course
  await db.courses.add(course)
  return course
}

export async function updateCourse(id: string, patch: Partial<Course>): Promise<void> {
  const cur = await db.courses.get(id)
  if (!cur) return
  await db.courses.put(touch({ ...cur, ...patch, id }))
}

export async function deleteCourse(id: string): Promise<void> {
  await db.transaction('rw', db.courses, db.topics, async () => {
    const topics = await db.topics.where('courseId').equals(id).toArray()
    await db.topics.bulkPut(topics.map(t => touch({ ...t, archived: true })))
    await db.courses.delete(id)
  })
}

export function useCourses(): Course[] | undefined {
  return useLiveQuery(() => db.courses.toArray(), [])
}
