import type {
  Checkin, Course, FocusSession, Habit, HabitLog, HealthDay, Task, Workout, WorkoutSet,
} from '../db/types'
import { addDays, diffDays, todayStr } from './dates'
import { isPlannedDay } from './habits'
import { setVolume } from './progression'

export interface StatsInput {
  sessions: FocusSession[]
  courses: Course[]
  workouts: Workout[]
  sets: WorkoutSet[]
  habits: Habit[]
  habitLogs: HabitLog[]
  checkins: Checkin[]
  health: HealthDay[]
  tasks: Task[]
}

export interface WeekSummary {
  weekStart: string
  focusMin: number
  byCourse: { courseId: string; name: string; color: string; min: number; target: number }[]
  ratedSessions: number
  workouts: number
  volume: number
  habitRate: number | null
  avgSleepH: number | null
  avgEnergy: number | null
  tasksDone: number
}

export const emptyStatsInput = (): StatsInput => ({
  sessions: [], courses: [], workouts: [], sets: [], habits: [], habitLogs: [], checkins: [], health: [], tasks: [],
})

const sessionDay = (s: FocusSession) => todayStr(new Date(s.startedAt))
const counted = (s: HabitLog['status']) => s === 'done' || s === 'min'
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export function weekHabitRate(habits: Habit[], logs: HabitLog[], ws: string, today: string): number | null {
  const we = addDays(ws, 6)
  const end = we < today ? we : today
  let done = 0
  let planned = 0
  for (const h of habits) {
    if (h.archived) continue
    const created = todayStr(new Date(h.createdAt))
    const from = created > ws ? created : ws
    if (from > end) continue
    const mine = logs.filter(l => l.habitId === h.id && l.date >= from && l.date <= end)
    if (h.schedule.type === 'days') {
      const byDate = new Map(mine.map(l => [l.date, l.status]))
      for (let d = from; d <= end; d = addDays(d, 1)) {
        if (!isPlannedDay(h, d)) continue
        const st = byDate.get(d)
        if (st === 'joker') continue
        planned++
        if (st && counted(st)) done++
      }
    } else {
      const wp = Math.ceil((h.schedule.n * (diffDays(from, end) + 1)) / 7)
      planned += wp
      done += Math.min(mine.filter(l => counted(l.status)).length, wp)
    }
  }
  return planned > 0 ? done / planned : null
}

export function weekSummary(input: StatsInput, ws: string, today: string = addDays(ws, 6)): WeekSummary {
  const we = addDays(ws, 6)
  const inWeek = (d: string) => d >= ws && d <= we
  const sessions = input.sessions.filter(s => inWeek(sessionDay(s)))
  const byId = new Map<string, number>()
  for (const s of sessions) if (s.courseId) byId.set(s.courseId, (byId.get(s.courseId) ?? 0) + s.minutes)
  const byCourse = input.courses
    .map(c => ({ courseId: c.id, name: c.name, color: c.color, min: byId.get(c.id) ?? 0, target: c.weeklyTargetMin }))
    .filter(c => c.min > 0)
    .sort((a, b) => b.min - a.min)

  const setsBy = new Map<string, WorkoutSet[]>()
  for (const st of input.sets) {
    const arr = setsBy.get(st.workoutId)
    if (arr) arr.push(st)
    else setsBy.set(st.workoutId, [st])
  }
  const workouts = input.workouts.filter(w => inWeek(w.date) && (setsBy.get(w.id)?.length ?? 0) > 0)
  const volume = workouts.reduce((a, w) => a + setVolume(setsBy.get(w.id)!), 0)

  const sleep = new Map<string, number>()
  for (const c of input.checkins) if (inWeek(c.date) && c.sleepHours !== undefined) sleep.set(c.date, c.sleepHours)
  for (const h of input.health) if (inWeek(h.date) && h.sleepMin !== undefined) sleep.set(h.date, h.sleepMin / 60)

  return {
    weekStart: ws,
    focusMin: sessions.reduce((a, s) => a + s.minutes, 0),
    byCourse,
    ratedSessions: sessions.filter(s => s.rating).length,
    workouts: workouts.length,
    volume,
    habitRate: weekHabitRate(input.habits, input.habitLogs, ws, today),
    avgSleepH: avg([...sleep.values()]),
    avgEnergy: avg(input.checkins.filter(c => inWeek(c.date) && c.energy !== undefined).map(c => c.energy!)),
    tasksDone: input.tasks.filter(t => t.doneAt && inWeek(todayStr(new Date(t.doneAt)))).length,
  }
}

export function trend(input: StatsInput, endWeekStart: string, weeks = 8, today?: string): WeekSummary[] {
  return Array.from({ length: weeks }, (_, i) =>
    weekSummary(input, addDays(endWeekStart, -7 * (weeks - 1 - i)), today ?? addDays(endWeekStart, 6)))
}

export function focusByHour(sessions: FocusSession[], today: string, days = 30): number[] {
  const out = new Array<number>(24).fill(0)
  const from = addDays(today, -(days - 1))
  for (const s of sessions) {
    const d = new Date(s.startedAt)
    const day = todayStr(d)
    if (day < from || day > today) continue
    out[d.getHours()] += s.minutes
  }
  return out
}

export const isBadWeek = (s: WeekSummary): boolean => s.habitRate !== null && s.habitRate < 0.4

export const fmtMin = (m: number): string => (m >= 60 ? `${Math.floor(m / 60)} sa${m % 60 ? ` ${m % 60} dk` : ""}` : `${m} dk`)
