export type Phase = 'work' | 'short' | 'long'
export interface PomodoroCfg { work: number; short: number; long: number; longEvery: number }
export interface ActiveTimer {
  mode: 'pomodoro' | 'serbest' | 'karisik'
  startedAt: string
  phase: Phase
  phaseStartedAt: string
  round: number
  workSec: number
  paused: boolean
  pausedAt?: string
  courseId?: string
  topicIds: string[]
  taskId?: string
}

export const STALE_MS = 4 * 3600 * 1000

export function phaseMinutes(phase: Phase, cfg: PomodoroCfg): number {
  return cfg[phase] > 0 ? cfg[phase] : 1
}

export function nextPhase(phase: Phase, round: number, cfg: PomodoroCfg): { phase: Phase; round: number } {
  if (phase === 'work') return { phase: round % cfg.longEvery === 0 ? 'long' : 'short', round }
  return { phase: 'work', round: round + 1 }
}

export function advance(t: ActiveTimer, now: Date, cfg: PomodoroCfg): { timer: ActiveTimer; finishedPhases: Phase[] } {
  if (t.paused || t.mode === 'serbest') return { timer: t, finishedPhases: [] }
  const finishedPhases: Phase[] = []
  let cur = { ...t }
  let start = new Date(cur.phaseStartedAt).getTime()
  for (;;) {
    const end = start + phaseMinutes(cur.phase, cfg) * 60000
    if (end > now.getTime()) break
    finishedPhases.push(cur.phase)
    if (cur.phase === 'work') cur.workSec += cfg.work * 60
    const n = nextPhase(cur.phase, cur.round, cfg)
    cur = { ...cur, phase: n.phase, round: n.round }
    start = end
  }
  if (finishedPhases.length) cur.phaseStartedAt = new Date(start).toISOString()
  return { timer: finishedPhases.length ? cur : t, finishedPhases }
}

function elapsedSec(t: ActiveTimer, now: Date): number {
  const ref = t.paused && t.pausedAt ? new Date(t.pausedAt) : now
  return Math.max(0, Math.floor((ref.getTime() - new Date(t.phaseStartedAt).getTime()) / 1000))
}

export function remainingSec(t: ActiveTimer, now: Date, cfg: PomodoroCfg): number {
  const el = elapsedSec(t, now)
  if (t.mode === 'serbest') return el
  return Math.max(0, phaseMinutes(t.phase, cfg) * 60 - el)
}

export function totalWorkSec(t: ActiveTimer, now: Date, cfg: PomodoroCfg): number {
  if (t.phase !== 'work') return t.workSec
  const el = elapsedSec(t, now)
  return t.workSec + (t.mode === 'serbest' ? el : Math.min(el, cfg.work * 60))
}

export function currentTopic(t: ActiveTimer): string | undefined {
  if (!t.topicIds.length) return undefined
  return t.mode === 'karisik' ? t.topicIds[(t.round - 1) % t.topicIds.length] : t.topicIds[0]
}

export function isStale(t: ActiveTimer, now: Date): boolean {
  return now.getTime() - new Date(t.startedAt).getTime() > STALE_MS
}
