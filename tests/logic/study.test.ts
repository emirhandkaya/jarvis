import { weekMinutes, dayMinutes, examCountdown, nearestExam } from '../../src/logic/study'
import type { Course, FocusSession } from '../../src/db/types'

const sess = (startedAt: Date, minutes: number, courseId?: string): FocusSession => ({
  id: 's', createdAt: '', updatedAt: '', startedAt: startedAt.toISOString(), endedAt: '', minutes,
  mode: 'serbest', topicIds: [], recall: [], courseId,
})
const course = (id: string, examDate?: string): Course => ({ id, createdAt: '', updatedAt: '', name: id, color: '', weeklyTargetMin: 300, examDate })

test('weekMinutes gece 02:00 önceki güne sayılır', () => {
  const s = [sess(new Date(2026, 10, 9, 2, 0), 30), sess(new Date(2026, 10, 9, 10, 0), 20, 'c')]
  expect(weekMinutes(s, '2026-11-02')).toBe(30)
  expect(weekMinutes(s, '2026-11-09')).toBe(20)
  expect(weekMinutes(s, '2026-11-09', 'c')).toBe(20)
  expect(weekMinutes(s, '2026-11-02', 'c')).toBe(0)
})
test('dayMinutes', () => {
  expect(dayMinutes([sess(new Date(2026, 10, 9, 2, 0), 30)], '2026-11-08')).toBe(30)
})
test('examCountdown / nearestExam', () => {
  expect(examCountdown('2026-11-01', '2026-11-07')).toBeNull()
  expect(examCountdown('2026-11-07', '2026-11-07')).toBe(0)
  expect(examCountdown(undefined, '2026-11-07')).toBeNull()
  const r = nearestExam([course('a', '2026-12-01'), course('b', '2026-11-10'), course('c'), course('d', '2026-10-01')], '2026-11-07')
  expect(r?.course.id).toBe('b'); expect(r?.days).toBe(3)
  expect(nearestExam([course('c')], '2026-11-07')).toBeNull()
})
