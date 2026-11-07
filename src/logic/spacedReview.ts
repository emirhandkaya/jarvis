import type { Topic } from '../db/types'
import { addDays, diffDays } from './dates'

export const STAGE_DAYS = [1, 3, 7, 14, 30, 60] as const
export type Rating = 'kolay' | 'orta' | 'zor'
export const COMPRESSION_WINDOW_DAYS = 14

export function nextStage(stage: Topic['stage'], rating: Rating): Topic['stage'] {
  const d = rating === 'kolay' ? 1 : rating === 'zor' ? -1 : 0
  return Math.min(5, Math.max(0, stage + d)) as Topic['stage']
}

export function reviewInterval(stage: Topic['stage'], today: string, examDate?: string): number {
  const base = STAGE_DAYS[stage]
  if (!examDate) return base
  const daysLeft = diffDays(today, examDate)
  if (daysLeft <= 0) return base
  if (daysLeft <= COMPRESSION_WINDOW_DAYS) return Math.min(base, Math.max(1, Math.floor(daysLeft / 2)))
  return Math.max(1, Math.min(base, daysLeft - 1))
}

export function applyReview(
  topic: Topic, rating: Rating, today: string, examDate?: string,
): Pick<Topic, 'stage' | 'lastReviewedAt' | 'nextReviewDate'> {
  const stage = nextStage(topic.stage, rating)
  return { stage, lastReviewedAt: today, nextReviewDate: addDays(today, reviewInterval(stage, today, examDate)) }
}

export function dueTopics(topics: Topic[], today: string): Topic[] {
  return topics
    .filter(t => !t.archived && t.nextReviewDate !== undefined && t.nextReviewDate <= today)
    .sort((a, b) => a.nextReviewDate!.localeCompare(b.nextReviewDate!) || a.name.localeCompare(b.name))
}
