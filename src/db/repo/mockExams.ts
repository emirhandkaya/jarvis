import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'
import { newRecord } from '../meta'
import type { MockExam } from '../types'

export async function addMockExam(courseId: string, date: string, score: number, notes?: string): Promise<MockExam> {
  const exam = newRecord<Omit<MockExam, 'id' | 'createdAt' | 'updatedAt'>>({
    courseId, date, score, ...(notes ? { notes } : {}),
  }) as MockExam
  await db.mockExams.add(exam)
  return exam
}

export async function deleteMockExam(id: string): Promise<void> {
  await db.mockExams.delete(id)
}

export function useMockExams(courseId: string): MockExam[] | undefined {
  return useLiveQuery(() => db.mockExams.where('courseId').equals(courseId).sortBy('date'), [courseId])
}
