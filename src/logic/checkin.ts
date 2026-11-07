import { todayStr, isSunday } from './dates'
import type { Checkin } from '../db/types'

export type DayPrompt = 'checkin' | 'kapanis' | 'degerlendirme' | null

export function dayPrompt(now: Date, today: Checkin | undefined, weekReviewed: boolean): DayPrompt {
  if (!today) return 'checkin'
  const h = now.getHours()
  const closed = !!(today.wins?.trim() || today.learned?.trim() || today.tomorrowFirst?.trim())
  if ((h >= 20 || h < 4) && !closed) return 'kapanis'
  if (isSunday(todayStr(now)) && !weekReviewed) return 'degerlendirme'
  return null
}

export function isMinimumDay(c: Checkin | undefined): boolean {
  return !!c && c.energy <= 2
}

export function suggestedPriorities(yesterday: Checkin | undefined): string[] {
  const first = yesterday?.tomorrowFirst?.trim()
  return first ? [first] : []
}
