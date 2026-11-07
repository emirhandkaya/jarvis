import { reviewWeekFor, reduceTargets } from '../../src/logic/review'

test('pazar: bu hafta, duzenle', () => {
  expect(reviewWeekFor('2026-11-08', [])).toEqual({ weekStart: '2026-11-02', mode: 'edit' })
  expect(reviewWeekFor('2026-11-08', ['2026-11-02'])).toEqual({ weekStart: '2026-11-02', mode: 'edit' })
})

test('pazartesi: onceki hafta; varsa bu hafta goruntule', () => {
  expect(reviewWeekFor('2026-11-09', [])).toEqual({ weekStart: '2026-11-02', mode: 'edit' })
  expect(reviewWeekFor('2026-11-09', ['2026-11-02'])).toEqual({ weekStart: '2026-11-09', mode: 'view' })
})

test('reduceTargets alt sinirlari korur', () => {
  const r = reduceTargets([{ id: 'a', weeklyTargetMin: 300 }, { id: 'b', weeklyTargetMin: 35 }], 1)
  expect(r.courses.map(c => c.weeklyTargetMin)).toEqual([210, 30])
  expect(r.workoutTarget).toBe(1)
  expect(reduceTargets([], 4).workoutTarget).toBe(3)
})

test('reduceTargets hedefi asla yukari cekmez', () => {
  const r = reduceTargets([{ id: 'a', weeklyTargetMin: 20 }, { id: 'b', weeklyTargetMin: 40 }], 1)
  expect(r.courses.map(c => c.weeklyTargetMin)).toEqual([20, 30])
  expect(r.workoutTarget).toBe(1)
})
