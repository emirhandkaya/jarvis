import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'
import { newRecord } from '../meta'
import type { FocusSession } from '../types'
import { getSettings, setSetting } from './settings'
import { reviewTopic } from './topics'
import { todayStr } from '../../logic/dates'
import type { Rating } from '../../logic/spacedReview'
import { totalWorkSec, type ActiveTimer } from '../../logic/timer'

export async function getActiveTimer(): Promise<ActiveTimer | null> {
  return (await getSettings()).activeTimer
}

export async function startTimer(
  opts: { mode: ActiveTimer['mode']; courseId?: string; topicIds: string[]; taskId?: string },
  now = new Date(),
): Promise<ActiveTimer> {
  const t: ActiveTimer = {
    ...opts, startedAt: now.toISOString(), phase: 'work', phaseStartedAt: now.toISOString(),
    round: 1, workSec: 0, paused: false,
  }
  await setSetting('activeTimer', t)
  return t
}

export async function saveTimer(t: ActiveTimer): Promise<void> {
  await setSetting('activeTimer', t)
}

export async function pauseTimer(now: Date): Promise<void> {
  const t = await getActiveTimer()
  if (!t || t.paused) return
  await saveTimer({ ...t, paused: true, pausedAt: now.toISOString() })
}

export async function resumeTimer(now: Date): Promise<void> {
  const t = await getActiveTimer()
  if (!t || !t.paused) return
  const gap = t.pausedAt ? now.getTime() - new Date(t.pausedAt).getTime() : 0
  const { pausedAt: _p, ...rest } = t
  await saveTimer({ ...rest, paused: false, phaseStartedAt: new Date(new Date(t.phaseStartedAt).getTime() + gap).toISOString() })
}

export async function discardTimer(): Promise<void> {
  await setSetting('activeTimer', null)
}

export async function finishTimer(
  now: Date,
  review: { recall: string[]; ratings: Record<string, Rating> },
): Promise<FocusSession | null> {
  const [t, settings] = await Promise.all([getActiveTimer(), getSettings()])
  if (!t) return null
  const sec = totalWorkSec(t, now, settings.pomodoro)
  const minutes = Math.round(sec / 60)
  if (sec < 60 || minutes < 1) { await discardTimer(); return null }
  const entries = Object.entries(review.ratings)
  const session = newRecord<Omit<FocusSession, 'id' | 'createdAt' | 'updatedAt'>>({
    startedAt: t.startedAt,
    endedAt: now.toISOString(),
    minutes,
    mode: t.mode,
    topicIds: t.topicIds,
    ...(t.courseId ? { courseId: t.courseId } : {}),
    ...(t.taskId ? { taskId: t.taskId } : {}),
    recall: review.recall.map(r => r.trim()).filter(Boolean).slice(0, 3),
    ...(entries.length ? { rating: entries[0][1] } : {}),
  }) as FocusSession
  await db.focusSessions.add(session)
  const day = todayStr(now)
  for (const [topicId, rating] of entries) await reviewTopic(topicId, rating, day)
  await discardTimer()
  return session
}

export function useFocusSessions(): FocusSession[] | undefined {
  return useLiveQuery(() => db.focusSessions.orderBy('startedAt').reverse().toArray(), [])
}
