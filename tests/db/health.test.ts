import { db } from '../../src/db/schema'
import { upsertHealth, recentHealth } from '../../src/db/repo/health'

beforeEach(async () => { await db.delete(); await db.open() })

test('ayni gunu tekrar iceri almak birlestirir, eksik alanlar korunur', async () => {
  expect(await upsertHealth([{ date: '2026-11-07', steps: 5000 }], 'url')).toBe(1)
  expect(await upsertHealth([{ date: '2026-11-07', sleepMin: 400 }], 'url')).toBe(1)
  const rows = await db.health.toArray()
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({ date: '2026-11-07', steps: 5000, sleepMin: 400, source: 'url' })
  await upsertHealth([{ date: '2026-11-07', steps: 6000 }], 'xml')
  expect(await db.health.get('2026-11-07')).toMatchObject({ steps: 6000, sleepMin: 400, source: 'xml' })
})

test('recentHealth son n gunu eskiden yeniye verir', async () => {
  await upsertHealth([1, 2, 3].map(i => ({ date: `2026-11-0${i}`, steps: i })), 'url')
  expect((await recentHealth(2)).map(h => h.date)).toEqual(['2026-11-02', '2026-11-03'])
})
