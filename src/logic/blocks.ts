import type { Block, FocusSession, Task } from '../db/types'
import { addDays, todayStr } from './dates'
import { weekday } from './habits'

export const DAY_START = 360
export const DAY_END = 1440
export const STEP = 15

const pad = (n: number) => String(n).padStart(2, '0')

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
export function toHHMM(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`
}
export function snap(min: number): number {
  return Math.round(min / STEP) * STEP
}

export function blocksForDay(blocks: Block[], date: string): Block[] {
  const wd = weekday(date)
  return blocks
    .filter(b => (b.repeatDays?.length
      ? b.repeatDays.includes(wd) && !(b.skipDates ?? []).includes(date)
      : b.date === date))
    .sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(a.end) - toMin(b.end))
}

export function layoutDay(blocks: Block[]): { block: Block; col: number; cols: number }[] {
  const sorted = [...blocks].sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(a.end) - toMin(b.end))
  const out: { block: Block; col: number; cols: number }[] = []
  let cluster: { block: Block; col: number }[] = []
  let colEnds: number[] = []
  let clusterEnd = -1
  const flush = () => {
    for (const c of cluster) out.push({ ...c, cols: colEnds.length })
    cluster = []
    colEnds = []
  }
  for (const b of sorted) {
    const s = toMin(b.start)
    const e = toMin(b.end)
    if (cluster.length && s >= clusterEnd) flush()
    let col = colEnds.findIndex(end => end <= s)
    if (col === -1) { col = colEnds.length; colEnds.push(e) } else colEnds[col] = e
    cluster.push({ block: b, col })
    clusterEnd = cluster.length === 1 ? e : Math.max(clusterEnd, e)
  }
  flush()
  return out
}

export function moveBlock(b: Pick<Block, 'start' | 'end'>, deltaMin: number): { start: string; end: string } {
  const s = toMin(b.start)
  const dur = toMin(b.end) - s
  const start = Math.min(Math.max(s + snap(deltaMin), DAY_START), DAY_END - dur)
  return { start: toHHMM(start), end: toHHMM(start + dur) }
}

export function resizeBlock(b: Pick<Block, 'start' | 'end'>, deltaEndMin: number): { start: string; end: string } {
  const s = toMin(b.start)
  const end = Math.min(Math.max(toMin(b.end) + snap(deltaEndMin), s + STEP), DAY_END)
  return { start: b.start, end: toHHMM(end) }
}

export function currentOrNext(dayBlocks: Block[], nowMin: number): { block: Block; state: 'now' | 'next' } | null {
  const sorted = [...dayBlocks].sort((a, b) => toMin(a.start) - toMin(b.start))
  const cur = sorted.find(b => toMin(b.start) <= nowMin && nowMin < toMin(b.end))
  if (cur) return { block: cur, state: 'now' }
  const next = sorted.find(b => toMin(b.start) > nowMin)
  return next ? { block: next, state: 'next' } : null
}

export function capacity(
  dayBlocks: Block[], openTasks: Task[], wakeTime: string, sleepTime: string,
): { plannedMin: number; awakeMin: number; over: boolean } {
  const wake = toMin(wakeTime)
  const sleep = toMin(sleepTime)
  const awakeMin = sleep > wake ? sleep - wake : 1440 - wake + sleep
  const linked = new Set(dayBlocks.map(b => b.refId).filter(Boolean))
  const blockMin = dayBlocks
    .filter(b => b.kind !== 'mola')
    .reduce((s, b) => s + Math.max(0, toMin(b.end) - toMin(b.start)), 0)
  const taskMin = openTasks.filter(t => !linked.has(t.id)).reduce((s, t) => s + (t.estimateMin ?? 0), 0)
  const plannedMin = blockMin + taskMin
  return { plannedMin, awakeMin, over: plannedMin > awakeMin * 0.7 }
}

export function peakWindow(sessions: FocusSession[], today: string): { start: string; end: string; fromData: boolean } {
  const fallback = { start: '09:00', end: '11:00', fromData: false }
  const from = addDays(today, -29)
  const days = new Set<string>()
  const byHour = new Array<number>(24).fill(0)
  for (const s of sessions) {
    const d = new Date(s.startedAt)
    const day = todayStr(d)
    if (day < from || day > today) continue
    days.add(day)
    byHour[d.getHours()] += s.minutes
  }
  if (days.size < 7) return fallback
  let best = 0
  let bestSum = -1
  for (let h = 0; h < 23; h++) {
    const sum = byHour[h] + byHour[h + 1]
    if (sum > bestSum) { bestSum = sum; best = h }
  }
  if (bestSum <= 0) return fallback
  return { start: toHHMM(best * 60), end: toHHMM((best + 2) * 60), fromData: true }
}

export function suggestSlot(
  dayBlocks: Block[], durationMin: number, window: { start: string; end: string }, afterMin: number,
): string | null {
  const free = (s: number) => dayBlocks.every(b => s + durationMin <= toMin(b.start) || s >= toMin(b.end))
  const scan = (lo: number, hi: number) => {
    const first = Math.ceil(Math.max(lo, afterMin, DAY_START) / STEP) * STEP
    for (let s = first; s + durationMin <= hi; s += STEP) if (free(s)) return toHHMM(s)
    return null
  }
  return scan(toMin(window.start), toMin(window.end)) ?? scan(DAY_START, DAY_END)
}
