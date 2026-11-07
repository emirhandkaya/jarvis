import { db } from '../../src/db/schema'
import { addTask, toggleDone } from '../../src/db/repo/tasks'
import { addGoal } from '../../src/db/repo/goals'

beforeEach(async () => { await db.delete(); await db.open() })

test('boş başlık eklenmez', async () => {
  expect(await addTask('   ')).toBeNull()
  expect(await db.tasks.count()).toBe(0)
})
test('toggleDone iki kez geri alır', async () => {
  const task = (await addTask('Fizik çöz'))!
  await toggleDone(task.id); expect((await db.tasks.get(task.id))!.doneAt).toBeTruthy()
  await toggleDone(task.id); expect((await db.tasks.get(task.id))!.doneAt).toBeUndefined()
})
test('cycle hedefi 12 hafta', async () => {
  const g = await addGoal('cycle', 'YKS netleri', undefined, '2026-11-09')
  expect(g.end).toBe('2027-02-01')
})
