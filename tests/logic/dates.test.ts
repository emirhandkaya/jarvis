import { todayStr, addDays, weekStart, diffDays, minutesOfDay, isSunday } from '../../src/logic/dates'

test('04:00 öncesi önceki gün sayılır', () => {
  expect(todayStr(new Date(2026, 10, 8, 0, 30))).toBe('2026-11-07')
  expect(todayStr(new Date(2026, 10, 8, 4, 0))).toBe('2026-11-08')
})
test('addDays ay/yıl sınırı', () => {
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
})
test('weekStart pazartesi döner', () => {
  expect(weekStart('2026-11-08')).toBe('2026-11-02') // pazar
  expect(weekStart('2026-11-02')).toBe('2026-11-02')
})
test('diffDays ve minutesOfDay', () => {
  expect(diffDays('2026-11-01', '2026-11-08')).toBe(7)
  expect(minutesOfDay('07:30')).toBe(450)
})
test('isSunday', () => {
  expect(isSunday('2026-11-08')).toBe(true)
  expect(isSunday('2026-11-07')).toBe(false)
})
