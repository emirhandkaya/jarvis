import type { Habit, HabitLog } from '../db/types'
import { addDays, diffDays, todayStr, weekStart } from './dates'

const WINDOW = 30
const ESTABLISH = 66
const HEATMAP_DAYS = 84

export function weekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).getDay() || 7
}

export function isPlannedDay(h: Habit, date: string): boolean {
  return h.schedule.type === 'days' ? h.schedule.days.includes(weekday(date)) : true
}

const createdDay = (h: Habit) => todayStr(new Date(h.createdAt))
const counted = (s: HabitLog['status'] | undefined) => s === 'done' || s === 'min'

export function consistency(h: Habit, logs: HabitLog[], today: string): { done: number; planned: number; rate: number } {
  const lo = addDays(today, -(WINDOW - 1))
  const c = createdDay(h)
  const from = c > lo ? c : lo
  let done = 0
  let planned = 0
  if (from <= today) {
    if (h.schedule.type === 'days') {
      const byDate = new Map(logs.map(l => [l.date, l.status]))
      for (let d = from; d <= today; d = addDays(d, 1)) {
        if (!isPlannedDay(h, d)) continue
        const st = byDate.get(d)
        if (st === 'joker') continue
        planned++
        if (counted(st)) done++
      }
    } else {
      const n = h.schedule.n
      for (let ws = weekStart(from); ws <= today; ws = addDays(ws, 7)) {
        const s = ws > from ? ws : from
        const we = addDays(ws, 6)
        const e = we < today ? we : today
        const wp = Math.ceil((n * (diffDays(s, e) + 1)) / 7)
        const wd = logs.filter(l => counted(l.status) && l.date >= s && l.date <= e).length
        planned += wp
        done += Math.min(wd, wp)
      }
    }
  }
  return { done, planned, rate: planned ? done / planned : 0 }
}

export function jokerAvailable(logs: HabitLog[], today: string): boolean {
  const ws = weekStart(today)
  const we = addDays(ws, 6)
  return !logs.some(l => l.status === 'joker' && l.date >= ws && l.date <= we)
}

export function missedYesterday(h: Habit, logs: HabitLog[], today: string): boolean {
  if (h.schedule.type !== 'days') return false
  const y = addDays(today, -1)
  return isPlannedDay(h, y) && y >= createdDay(h) && !logs.some(l => l.date === y)
}

export function establishment(logs: HabitLog[]): { days: number; ratio: number } {
  const days = logs.filter(l => counted(l.status)).length
  return { days, ratio: Math.min(days, ESTABLISH) / ESTABLISH }
}

export function todayList(habits: Habit[], logs: HabitLog[], today: string) {
  const ws = weekStart(today)
  const we = addDays(ws, 6)
  const out: { habit: Habit; status?: HabitLog['status']; missedYesterday: boolean; weekDone?: number }[] = []
  for (const habit of habits) {
    if (habit.archived) continue
    const mine = logs.filter(l => l.habitId === habit.id)
    const status = mine.find(l => l.date === today)?.status
    if (habit.schedule.type === 'days') {
      if (!isPlannedDay(habit, today)) continue
      out.push({ habit, status, missedYesterday: missedYesterday(habit, mine, today) })
    } else {
      const weekDone = mine.filter(l => counted(l.status) && l.date >= ws && l.date <= we).length
      if (weekDone >= habit.schedule.n && !counted(status)) continue
      out.push({ habit, status, missedYesterday: false, weekDone })
    }
  }
  return out
}

export function heatmap(logs: HabitLog[], today: string): { date: string; status?: HabitLog['status'] }[] {
  const byDate = new Map(logs.map(l => [l.date, l.status]))
  return Array.from({ length: HEATMAP_DAYS }, (_, i) => {
    const date = addDays(today, -(HEATMAP_DAYS - 1 - i))
    return { date, status: byDate.get(date) }
  })
}
