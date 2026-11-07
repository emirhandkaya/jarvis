import { db } from '../../src/db/schema'
import { addTask } from '../../src/db/repo/tasks'
import { saveMorning } from '../../src/db/repo/checkins'
import { exportAll, importAll } from '../../src/db/repo/backup'
import type { BackupFile } from '../../src/logic/backup'

beforeEach(async () => { await db.delete(); await db.open() })

test('dışa → sil → içe gidiş dönüş', async () => {
  await addTask('A'); await saveMorning('2026-11-07', { energy: 3, mood: 3, priorities: [] })
  const file = await exportAll()
  await db.tasks.clear(); await db.checkins.clear()
  await importAll(file)
  expect(await db.tasks.count()).toBe(1); expect(await db.checkins.count()).toBe(1)
})
test('içe aktarma ortasında hata olursa mevcut veri kalır', async () => {
  await addTask('Mevcut')
  const bad = { app: 'jarvis', schemaVersion: 1, exportedAt: '', tables: { tasks: [{ id: 'x' }, { id: 'x' }] } } as BackupFile // tekrar eden PK
  await expect(importAll(bad)).rejects.toThrow()
  expect((await db.tasks.toArray()).map(t => t.title)).toEqual(['Mevcut'])
})
