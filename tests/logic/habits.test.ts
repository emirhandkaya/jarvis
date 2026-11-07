import {
  weekday, isPlannedDay, consistency, jokerAvailable, missedYesterday, establishment, todayList, heatmap,
} from '../../src/logic/habits'
import { addDays } from '../../src/logic/dates'
import type { Habit, HabitLog } from '../../src/db/types'

const mk = (schedule: Habit['schedule'], created = new Date(2026, 9, 1, 12)): Habit => ({
  id: 'h', name: 'x', ifThen: '', minVersion: '', schedule, archived: false,
  createdAt: created.toISOString(), updatedAt: created.toISOString(),
})
const log = (date: string, status: HabitLog['status'], habitId = 'h'): HabitLog =>
  ({ id: habitId + date, habitId, date, status, createdAt: '', updatedAt: '' })

test('weekday', () => {
  expect(weekday('2026-11-09')).toBe(1)
  expect(weekday('2026-11-08')).toBe(7)
})
test('isPlannedDay', () => {
  expect(isPlannedDay(mk({ type: 'days', days: [1, 3] }), '2026-11-09')).toBe(true)
  expect(isPlannedDay(mk({ type: 'days', days: [1, 3] }), '2026-11-10')).toBe(false)
  expect(isPlannedDay(mk({ type: 'perWeek', n: 3 }), '2026-11-10')).toBe(true)
})
test('days aliskanligi: 13 planli gun, 1 joker, 1 kacirilan', () => {
  // pencere 2026-10-09..2026-11-07: Pzt/Car/Cum gunleri 13 tane
  const days = ['2026-10-09', '2026-10-12', '2026-10-14', '2026-10-16', '2026-10-19', '2026-10-21', '2026-10-23',
    '2026-10-26', '2026-10-28', '2026-10-30', '2026-11-02', '2026-11-04', '2026-11-06']
  const logs = days.filter(d => d !== '2026-10-12' && d !== '2026-10-14').map(d => log(d, d === '2026-10-16' ? 'min' : 'done'))
  logs.push(log('2026-10-14', 'joker'))
  const r = consistency(mk({ type: 'days', days: [1, 3, 5] }), logs, '2026-11-07')
  expect(r.planned).toBe(12)
  expect(r.done).toBe(11)
  expect(r.rate).toBeCloseTo(11 / 12)
})
test('pencere ortasinda olusturulan aliskanlik yalniz kendi gunlerini sayar', () => {
  const h = mk({ type: 'days', days: [1, 2, 3, 4, 5, 6, 7] }, new Date(2026, 10, 5, 12))
  expect(consistency(h, [], '2026-11-07')).toEqual({ done: 0, planned: 3, rate: 0 })
})
test('perWeek tutarlilik', () => {
  const h = mk({ type: 'perWeek', n: 3 }, new Date(2026, 10, 2, 12)) // 2026-11-02 Pzt
  const logs = [log('2026-11-02', 'done'), log('2026-11-04', 'min'), log('2026-11-06', 'done'), log('2026-11-07', 'done')]
  expect(consistency(h, logs, '2026-11-07')).toEqual({ done: 3, planned: 3, rate: 1 })
})
test('jokerAvailable', () => {
  const logs = [log('2026-11-03', 'joker')]
  expect(jokerAvailable(logs, '2026-11-07')).toBe(false)
  expect(jokerAvailable(logs, '2026-11-09')).toBe(true)
})
test('missedYesterday', () => {
  const h = mk({ type: 'days', days: [5] })
  expect(missedYesterday(h, [], '2026-11-07')).toBe(true) // dun Cuma
  expect(missedYesterday(h, [log('2026-11-06', 'done')], '2026-11-07')).toBe(false)
  const fresh = mk({ type: 'days', days: [5] }, new Date(2026, 10, 7, 12))
  expect(missedYesterday(fresh, [], '2026-11-07')).toBe(false)
  expect(missedYesterday(mk({ type: 'perWeek', n: 2 }), [], '2026-11-07')).toBe(false)
})
test('establishment', () => {
  const logs = Array.from({ length: 70 }, (_, i) => log(addDays('2026-01-01', i), 'done'))
  expect(establishment(logs)).toEqual({ days: 70, ratio: 1 })
  expect(establishment([log('2026-01-01', 'joker')])).toEqual({ days: 0, ratio: 0 })
})
test('todayList perWeek', () => {
  const h = mk({ type: 'perWeek', n: 3 })
  const two = [log('2026-11-02', 'done'), log('2026-11-03', 'done')]
  expect(todayList([h], two, '2026-11-07')).toHaveLength(1)
  expect(todayList([h], two, '2026-11-07')[0].weekDone).toBe(2)
  const three = [...two, log('2026-11-04', 'done')]
  expect(todayList([h], three, '2026-11-07')).toHaveLength(0)
  expect(todayList([h], [...two, log('2026-11-07', 'done')], '2026-11-07')[0].status).toBe('done')
})
test('todayList days ve arsiv', () => {
  const sat = mk({ type: 'days', days: [6] })
  const mon = mk({ type: 'days', days: [1] })
  const arch = { ...mk({ type: 'days', days: [6] }), archived: true }
  expect(todayList([sat, mon, arch], [], '2026-11-07')).toHaveLength(1)
})
test('heatmap', () => {
  const h = heatmap([log('2026-11-07', 'done')], '2026-11-07')
  expect(h).toHaveLength(84)
  expect(h[83]).toEqual({ date: '2026-11-07', status: 'done' })
  expect(h[0].date).toBe(addDays('2026-11-07', -83))
})
