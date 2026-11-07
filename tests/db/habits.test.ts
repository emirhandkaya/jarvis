import { db } from '../../src/db/schema'
import { addHabit, archiveHabit, updateHabit, setHabitStatus } from '../../src/db/repo/habits'

beforeEach(async () => { await db.delete(); await db.open() })

const sched = { type: 'perWeek', n: 3 } as const

test('bos isim null doner', async () => {
  expect(await addHabit('   ', { schedule: sched })).toBeNull()
  expect(await db.habits.count()).toBe(0)
})

test('ekle, guncelle, arsivle', async () => {
  const h = (await addHabit(' Su ', { ifThen: 'a', schedule: sched }))!
  expect(h).toMatchObject({ name: 'Su', ifThen: 'a', minVersion: '', archived: false })
  await updateHabit(h.id, { minVersion: '1 bardak' })
  await archiveHabit(h.id)
  expect(await db.habits.get(h.id)).toMatchObject({ minVersion: '1 bardak', archived: true })
})

test('ayni gune iki kez yazmak guncelller, cogaltmaz; null siler', async () => {
  const h = (await addHabit('x', { schedule: sched }))!
  await setHabitStatus(h.id, '2026-11-07', 'min')
  await setHabitStatus(h.id, '2026-11-07', 'done')
  const logs = await db.habitLogs.toArray()
  expect(logs).toHaveLength(1)
  expect(logs[0].status).toBe('done')
  await setHabitStatus(h.id, '2026-11-07', null)
  expect(await db.habitLogs.count()).toBe(0)
})

test('ayni haftada ikinci joker reddedilir, baska haftada olur, ayni gunu yenilemek olur', async () => {
  const h = (await addHabit('x', { schedule: sched }))!
  expect(await setHabitStatus(h.id, '2026-11-03', 'joker')).toBe('ok')
  expect(await setHabitStatus(h.id, '2026-11-05', 'joker')).toBe('joker-limit')
  expect(await db.habitLogs.count()).toBe(1)
  expect(await setHabitStatus(h.id, '2026-11-03', 'joker')).toBe('ok')
  expect(await setHabitStatus(h.id, '2026-11-10', 'joker')).toBe('ok')
})
