import { emptyStatsInput, weekSummary, weekHabitRate, focusByHour, isBadWeek, trend, type StatsInput } from '../../src/logic/stats'
import type { FocusSession, Habit, HabitLog } from '../../src/db/types'

const iso = (y: number, m: number, d: number, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi).toISOString()
const sess = (startedAt: string, minutes: number, extra: Partial<FocusSession> = {}): FocusSession => ({
  id: crypto.randomUUID(), createdAt: startedAt, updatedAt: startedAt, startedAt, endedAt: startedAt,
  minutes, mode: 'serbest', topicIds: [], recall: [], ...extra,
})
const habit = (schedule: Habit['schedule']): Habit => ({
  id: 'h1', createdAt: iso(2026, 10, 1), updatedAt: iso(2026, 10, 1), name: 'x', ifThen: '', minVersion: '', schedule, archived: false,
})
const log = (date: string, status: HabitLog['status'], habitId = 'h1'): HabitLog => ({
  id: crypto.randomUUID(), createdAt: '', updatedAt: '', habitId, date, status,
})

test('bos girdi: sifirlar ve null, NaN yok', () => {
  const s = weekSummary(emptyStatsInput(), '2026-11-02')
  expect(s).toMatchObject({ focusMin: 0, habitRate: null, avgSleepH: null, avgEnergy: null, byCourse: [], workouts: 0, volume: 0, tasksDone: 0 })
  expect(focusByHour([], '2026-11-08').every(v => v === 0)).toBe(true)
  expect(trend(emptyStatsInput(), '2026-11-02')).toHaveLength(8)
})

test('gece 02:00 oturumu onceki gune/haftaya sayilir, saat 2de', () => {
  const input: StatsInput = { ...emptyStatsInput(), sessions: [sess(iso(2026, 11, 9, 2), 30)] }
  expect(weekSummary(input, '2026-11-02').focusMin).toBe(30)
  expect(weekSummary(input, '2026-11-09').focusMin).toBe(0)
  expect(focusByHour(input.sessions, '2026-11-09')[2]).toBe(30)
})

test('byCourse sirali ve target icerir', () => {
  const c = (id: string, t: number) => ({ id, name: id, color: '#fff', weeklyTargetMin: t, createdAt: '', updatedAt: '' })
  const input: StatsInput = {
    ...emptyStatsInput(), courses: [c('a', 100), c('b', 200)],
    sessions: [
      sess(iso(2026, 11, 3), 20, { courseId: 'a' }),
      sess(iso(2026, 11, 4), 50, { courseId: 'b' }),
      sess(iso(2026, 11, 5), 10, { courseId: 'a', rating: 'orta' }),
    ],
  }
  const s = weekSummary(input, '2026-11-02')
  expect(s.byCourse.map(x => [x.courseId, x.min, x.target])).toEqual([['b', 50, 200], ['a', 30, 100]])
  expect(s.ratedSessions).toBe(1)
})

test('0 setli antrenman sayilmaz, hacim toplanir', () => {
  const w = (id: string, date: string) => ({ id, date, isDeload: false, createdAt: '', updatedAt: '' })
  const st = (workoutId: string) => ({ id: crypto.randomUUID(), workoutId, exerciseId: 'e', order: 0, weightKg: 50, reps: 10, createdAt: '', updatedAt: '' })
  const input: StatsInput = { ...emptyStatsInput(), workouts: [w('w1', '2026-11-03'), w('w2', '2026-11-04')], sets: [st('w1'), st('w1')] }
  const s = weekSummary(input, '2026-11-02')
  expect(s.workouts).toBe(1)
  expect(s.volume).toBe(1000)
})

test('uyku: saglik checkin yerine gecer', () => {
  const input: StatsInput = {
    ...emptyStatsInput(),
    checkins: [{ date: '2026-11-03', sleepHours: 6, energy: 4, priorities: [], createdAt: '', updatedAt: '' }],
    health: [{ date: '2026-11-03', sleepMin: 420, source: 'x', createdAt: '', updatedAt: '' }],
  }
  const s = weekSummary(input, '2026-11-02')
  expect(s.avgSleepH).toBe(7)
  expect(s.avgEnergy).toBe(4)
})

test('weekHabitRate: gun tipi joker dusulur, haftalik n', () => {
  const h = habit({ type: 'days', days: [1, 3, 5] })
  const logs = [log('2026-11-02', 'done'), log('2026-11-04', 'min'), log('2026-11-06', 'joker')]
  expect(weekHabitRate([h], logs, '2026-11-02', '2026-11-08')).toBe(1)
  const w = habit({ type: 'perWeek', n: 3 })
  expect(weekHabitRate([w], [log('2026-11-03', 'done')], '2026-11-02', '2026-11-08')).toBeCloseTo(1 / 3)
  expect(weekHabitRate([], [], '2026-11-02', '2026-11-08')).toBeNull()
})

test('isBadWeek esigi', () => {
  const base = weekSummary(emptyStatsInput(), '2026-11-02')
  expect(isBadWeek({ ...base, habitRate: 0.39 })).toBe(true)
  expect(isBadWeek({ ...base, habitRate: 0.4 })).toBe(false)
  expect(isBadWeek(base)).toBe(false)
})
