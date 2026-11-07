import { nextStage, reviewInterval, applyReview, dueTopics } from '../../src/logic/spacedReview'
import type { Topic } from '../../src/db/types'

const topic = (o: Partial<Topic> = {}): Topic => ({
  id: 'x', createdAt: '', updatedAt: '', courseId: 'c', name: 'n', stage: 0, archived: false, ...o,
})

test('nextStage', () => {
  expect(nextStage(0, 'zor')).toBe(0)
  expect(nextStage(5, 'kolay')).toBe(5)
  expect(nextStage(2, 'kolay')).toBe(3)
  expect(nextStage(2, 'orta')).toBe(2)
  expect(nextStage(2, 'zor')).toBe(1)
})
test('reviewInterval', () => {
  const t = '2026-11-07'
  expect(reviewInterval(3, t)).toBe(14)
  expect(reviewInterval(5, t, '2026-12-30')).toBe(52)
  expect(reviewInterval(2, t, '2026-12-30')).toBe(7)
  expect(reviewInterval(3, t, '2026-11-17')).toBe(5)
  expect(reviewInterval(0, t, '2026-11-17')).toBe(1)
  expect(reviewInterval(4, t, '2026-11-08')).toBe(1)
  expect(reviewInterval(2, t, '2026-11-01')).toBe(7)
})
test('applyReview', () => {
  expect(applyReview(topic({ stage: 1 }), 'kolay', '2026-11-07')).toEqual({ stage: 2, lastReviewedAt: '2026-11-07', nextReviewDate: '2026-11-14' })
})
test('dueTopics', () => {
  const list = [
    topic({ id: 'a', name: 'b', nextReviewDate: '2026-11-06' }),
    topic({ id: 'b', name: 'a', nextReviewDate: '2026-11-06' }),
    topic({ id: 'c', nextReviewDate: '2026-11-01' }),
    topic({ id: 'd', nextReviewDate: '2026-11-01', archived: true }),
    topic({ id: 'e', nextReviewDate: '2026-11-08' }),
    topic({ id: 'f' }),
  ]
  expect(dueTopics(list, '2026-11-07').map(t => t.id)).toEqual(['c', 'b', 'a'])
})
