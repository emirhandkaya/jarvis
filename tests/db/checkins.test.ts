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
test('akşam kaydı sabahtan önce de çalışır', async () => {
  await saveEvening('2026-11-07', { wins: 'x' })
  expect(await db.checkins.get('2026-11-07')).toMatchObject({ wins: 'x', energy: 3, mood: 3 })
})
