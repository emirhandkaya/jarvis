import { dayPrompt } from '../../src/logic/checkin'
import { db } from '../../src/db/schema'
import { saveMorning, saveEvening } from '../../src/db/repo/checkins'

beforeEach(async () => { await db.delete(); await db.open() })

test('sabah ve akşam kaydı birbirini silmez', async () => {
  await saveMorning('2026-11-07', { energy: 4, mood: 3, priorities: ['a'] })
  await saveEvening('2026-11-07', { wins: 'spor' })
  await saveMorning('2026-11-07', { energy: 2, mood: 3, priorities: ['a'] })
  const c = await db.checkins.get('2026-11-07')
  expect(c).toMatchObject({ energy: 2, wins: 'spor' })
  expect(await db.checkins.count()).toBe(1)
})
test('yalnız akşam kaydı: sahte enerji/ruh hali yazılmaz, check-in hâlâ istenir', async () => {
  await saveEvening('2026-11-07', { wins: 'x' })
  const c = await db.checkins.get('2026-11-07')
  expect(c).toMatchObject({ wins: 'x' })
  expect(c!.energy).toBeUndefined()
  expect(c!.mood).toBeUndefined()
  expect(dayPrompt(new Date(2026, 10, 7, 9), c, false)).toBe('checkin')
})
test('undefined alanlar mevcut değeri silmez', async () => {
  await saveEvening('2026-11-07', { wins: 'spor', learned: 'a' })
  await saveEvening('2026-11-07', { wins: undefined, learned: 'b' })
  expect(await db.checkins.get('2026-11-07')).toMatchObject({ wins: 'spor', learned: 'b' })
  await saveMorning('2026-11-07', { sleepHours: 7, energy: 3, mood: 3, priorities: [] })
  await saveMorning('2026-11-07', { sleepHours: undefined, energy: 4, mood: 3, priorities: [] })
  expect((await db.checkins.get('2026-11-07'))!.sleepHours).toBe(7)
})
