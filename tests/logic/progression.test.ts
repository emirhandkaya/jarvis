import { suggestNext, deloadReason, deloadSets, setVolume } from '../../src/logic/progression'
import type { Exercise, WorkoutSet } from '../../src/db/types'

const ex = { repMin: 8, repMax: 12, incrementKg: 2.5 } as Exercise
const s = (weightKg: number, reps: number) => ({ weightKg, reps }) as WorkoutSet

test('tüm setler repMax -> artır', () => {
  expect(suggestNext(ex, [s(60, 12), s(60, 12), s(60, 12)], [])).toEqual({ weightKg: 62.5, reps: 8, reason: 'artir' })
})
test('aynı ağırlık, +1 tekrar', () => {
  expect(suggestNext(ex, [s(60, 12), s(60, 10), s(60, 9)], [])).toEqual({ weightKg: 60, reps: 10, reason: 'tekrar' })
})
test('iki antrenman repMin altı -> hafiflet', () => {
  expect(suggestNext(ex, [s(60, 7), s(60, 8)], [s(60, 7)])).toEqual({ weightKg: 54, reps: 8, reason: 'hafiflet' })
})
test('hafiflet iki antrenman ister', () => {
  expect(suggestNext(ex, [s(60, 7)], [])).toEqual({ weightKg: 60, reps: 8, reason: 'tekrar' })
})
test('geçmiş yok -> null', () => {
  expect(suggestNext(ex, [], [])).toBeNull()
})
test('deloadReason zaman', () => {
  expect(deloadReason('2026-09-26', undefined, '2026-11-07', [])).toBe('zaman')
  expect(deloadReason('2026-09-27', undefined, '2026-11-07', [])).toBeNull()
  expect(deloadReason(undefined, '2026-09-26', '2026-11-07', [])).toBe('zaman')
})
test('deloadReason yorgunluk', () => {
  expect(deloadReason(undefined, undefined, '2026-11-07', [3, 2, 1])).toBe('yorgunluk')
  expect(deloadReason(undefined, undefined, '2026-11-07', [2, 3])).toBeNull()
  expect(deloadReason('2026-09-01', undefined, '2026-11-07', [1, 1, 1])).toBe('yorgunluk')
})
test('deloadSets ve setVolume', () => {
  expect(deloadSets(3)).toBe(2)
  expect(deloadSets(1)).toBe(1)
  expect(setVolume([s(60, 10), s(50, 8)])).toBe(1000)
})
