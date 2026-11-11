import type { FocusSession } from '../db/types'
import { addDays, todayStr } from './dates'
import { peakWindow } from './blocks'
import type { StatsInput } from './stats'

export interface DayRecord { date: string; focusMin: number; sleepH?: number; energy?: number; workout: boolean }
export interface Insight { id: 'uyku-odak' | 'verimli-saat' | 'spor-enerji'; text: string }

const MIN_DAYS = 7
const MIN_DIFF_PCT = 15

export function buildDayRecords(input: StatsInput, today: string, days = 60): DayRecord[] {
  const focus = new Map<string, number>()
  for (const s of input.sessions) {
    const d = todayStr(new Date(s.startedAt))
    focus.set(d, (focus.get(d) ?? 0) + s.minutes)
  }
  const setCount = new Map<string, number>()
  for (const st of input.sets) setCount.set(st.workoutId, (setCount.get(st.workoutId) ?? 0) + 1)
  const workoutDays = new Set(input.workouts.filter(w => (setCount.get(w.id) ?? 0) > 0).map(w => w.date))
  const checkins = new Map(input.checkins.map(c => [c.date, c]))
  const health = new Map(input.health.map(h => [h.date, h]))
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, -(days - i))
    const c = checkins.get(date)
    const h = health.get(date)
    const sleepH = h?.sleepMin !== undefined ? h.sleepMin / 60 : c?.sleepHours
    return { date, focusMin: focus.get(date) ?? 0, sleepH, energy: c?.energy, workout: workoutDays.has(date) }
  })
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

export function compare(a: number[], b: number[]): { meanA: number; meanB: number; diffPct: number } | null {
  if (a.length < MIN_DAYS || b.length < MIN_DAYS) return null
  const meanA = mean(a)
  const meanB = mean(b)
  if (meanB === 0) return null
  const diffPct = ((meanA - meanB) / meanB) * 100
  if (Math.abs(diffPct) <= MIN_DIFF_PCT) return null
  return { meanA, meanB, diffPct }
}

export function computeInsights(records: DayRecord[], sessions: FocusSession[], today: string): Insight[] {
  const out: Insight[] = []

  const withSleep = records.filter(r => r.sleepH !== undefined)
  const sleepCmp = compare(
    withSleep.filter(r => r.sleepH! >= 7).map(r => r.focusMin),
    withSleep.filter(r => r.sleepH! < 7).map(r => r.focusMin),
  )
  if (sleepCmp) {
    const more = sleepCmp.diffPct > 0 ? 'daha fazla' : 'daha az'
    out.push({
      id: 'uyku-odak',
      text: `7+ saat uyuduğun günlerde %${Math.round(Math.abs(sleepCmp.diffPct))} ${more} odaklanıyorsun`,
    })
  }

  const peak = peakWindow(sessions, today)
  if (peak.fromData) {
    out.push({ id: 'verimli-saat', text: `En verimli saatlerin: ${Number(peak.start.slice(0, 2))}–${Number(peak.end.slice(0, 2))}` })
  }

  const byDate = new Map(records.map(r => [r.date, r]))
  const afterWorkout: number[] = []
  const afterRest: number[] = []
  for (const r of records) {
    const next = byDate.get(addDays(r.date, 1))
    if (next?.energy === undefined) continue
    if (r.workout) afterWorkout.push(next.energy)
    else afterRest.push(next.energy)
  }
  const sporCmp = compare(afterWorkout, afterRest)
  if (sporCmp) {
    const hi = sporCmp.diffPct > 0 ? 'daha yüksek' : 'daha düşük'
    out.push({
      id: 'spor-enerji',
      text: `Spor yaptığın günün ertesinde enerjin %${Math.round(Math.abs(sporCmp.diffPct))} ${hi}`,
    })
  }
  return out
}
