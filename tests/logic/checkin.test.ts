import { dayPrompt, isMinimumDay, suggestedPriorities } from '../../src/logic/checkin'
import type { Checkin } from '../../src/db/types'

test('dayPrompt sırası', () => {
  const morning = { date: '2026-11-07', energy: 3, mood: 3, priorities: [] } as unknown as Checkin
  expect(dayPrompt(new Date(2026, 10, 7, 9), undefined, false)).toBe('checkin')
  expect(dayPrompt(new Date(2026, 10, 7, 9), morning, false)).toBeNull()
  expect(dayPrompt(new Date(2026, 10, 7, 21), morning, false)).toBe('kapanis')
  expect(dayPrompt(new Date(2026, 10, 8, 1), morning, false)).toBe('kapanis') // gece 01:00, hâlâ 7 Kasım
  expect(dayPrompt(new Date(2026, 10, 8, 10), { ...morning, date: '2026-11-08' }, false)).toBe('degerlendirme') // pazar
})
test('enerji 2 minimum gün', () => {
  expect(isMinimumDay({ energy: 2 } as Checkin)).toBe(true)
  expect(isMinimumDay({ energy: 3 } as Checkin)).toBe(false)
})
test('enerji tanımsızsa minimum gün değil', () => {
  expect(isMinimumDay({} as Checkin)).toBe(false)
  expect(isMinimumDay(undefined)).toBe(false)
})
test('dünün tomorrowFirst önerisi ilk sırada', () => {
  expect(suggestedPriorities({ tomorrowFirst: 'Fizik' } as Checkin)).toEqual(['Fizik'])
  expect(suggestedPriorities(undefined)).toEqual([])
})
