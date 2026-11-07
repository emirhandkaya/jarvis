import { db } from '../../src/db/schema'

beforeEach(async () => { await db.delete(); await db.open() })

test('tüm tablolar açılır', async () => {
  await db.open()
  expect(db.tables.map(t => t.name).sort()).toEqual(['blocks','checkins','courses','exercises','focusSessions','goals','habitLogs','habits','health','mockExams','reviews','sets','settings','tasks','templates','topics','workouts'])
})
test('habitLogs [habitId+date] benzersiz', async () => {
  await db.habitLogs.add({ id: 'a', habitId: 'h', date: '2026-11-07', status: 'done', createdAt: '', updatedAt: '' })
  await expect(db.habitLogs.add({ id: 'b', habitId: 'h', date: '2026-11-07', status: 'min', createdAt: '', updatedAt: '' })).rejects.toThrow()
})
