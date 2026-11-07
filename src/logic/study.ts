import type { Course, FocusSession } from '../db/types'
import { addDays, diffDays, todayStr } from './dates'

function sum(sessions: FocusSession[], pred: (day: string) => boolean, courseId?: string): number {
  return sessions
    .filter(s => (courseId === undefined || s.courseId === courseId) && pred(todayStr(new Date(s.startedAt))))
    .reduce((a, s) => a + s.minutes, 0)
}

export function weekMinutes(sessions: FocusSession[], weekStartDate: string, courseId?: string): number {
  const end = addDays(weekStartDate, 6)
  return sum(sessions, d => d >= weekStartDate && d <= end, courseId)
}

export function dayMinutes(sessions: FocusSession[], day: string): number {
  return sum(sessions, d => d === day)
}

export function examCountdown(examDate: string | undefined, today: string): number | null {
  if (!examDate) return null
  const n = diffDays(today, examDate)
  return n < 0 ? null : n
}

export function nearestExam(courses: Course[], today: string): { course: Course; days: number } | null {
  let best: { course: Course; days: number } | null = null
  for (const course of courses) {
    const days = examCountdown(course.examDate, today)
    if (days !== null && (!best || days < best.days)) best = { course, days }
  }
  return best
}
