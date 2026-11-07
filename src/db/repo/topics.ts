import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'
import { newRecord, touch } from '../meta'
import type { Course, Topic } from '../types'
import { applyReview, dueTopics, type Rating } from '../../logic/spacedReview'

export async function addTopic(courseId: string, name: string): Promise<Topic | null> {
  const clean = name.trim()
  if (!clean) return null
  const topic = newRecord<Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>>({
    courseId, name: clean, stage: 0, archived: false,
  }) as Topic
  await db.topics.add(topic)
  return topic
}

export async function reviewTopic(id: string, rating: Rating, today: string): Promise<void> {
  const topic = await db.topics.get(id)
  if (!topic) return
  const course = await db.courses.get(topic.courseId)
  await db.topics.put(touch({ ...topic, ...applyReview(topic, rating, today, course?.examDate) }))
}

export async function archiveTopic(id: string): Promise<void> {
  const cur = await db.topics.get(id)
  if (!cur) return
  await db.topics.put(touch({ ...cur, archived: true }))
}

export async function dueTopicsWithCourse(today: string): Promise<{ topic: Topic; course: Course }[]> {
  const [topics, courses] = await Promise.all([db.topics.toArray(), db.courses.toArray()])
  const byId = new Map(courses.map(c => [c.id, c]))
  return dueTopics(topics, today).flatMap(topic => {
    const course = byId.get(topic.courseId)
    return course ? [{ topic, course }] : []
  })
}

export function useTopics(courseId?: string): Topic[] | undefined {
  return useLiveQuery(
    () => (courseId ? db.topics.where('courseId').equals(courseId).toArray() : db.topics.toArray()),
    [courseId],
  )
}

export function useDueTopics(today: string) {
  return useLiveQuery(() => dueTopicsWithCourse(today), [today])
}
