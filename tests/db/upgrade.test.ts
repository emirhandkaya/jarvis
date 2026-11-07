import Dexie from 'dexie'
import { db } from '../../src/db/schema'
import { validateBackup } from '../../src/logic/backup'

test('v1 verisi v2 açılışında korunur', async () => {
  await db.delete()
  const v1 = new Dexie('jarvis')
  v1.version(1).stores({
    settings: 'key', checkins: 'date', goals: 'id, kind, parentId',
    tasks: 'id, plannedDate, dueDate, doneAt, goalId', courses: 'id',
    topics: 'id, courseId, nextReviewDate', focusSessions: 'id, startedAt, courseId',
    exercises: 'id', templates: 'id', workouts: 'id, date', sets: 'id, workoutId, exerciseId',
    habits: 'id', habitLogs: 'id, &[habitId+date], date', blocks: 'id, date', health: 'date', reviews: 'weekStart',
  })
  await v1.open()
  await v1.table('tasks').add({ id: 't1', title: 'x', tag: 'ders', priority: 2, energy: 'low', createdAt: '', updatedAt: '' })
  v1.close()
  await db.open()
  expect(await db.tasks.count()).toBe(1)
  expect(await db.mockExams.count()).toBe(0)
})
test('v1 yedeği hâlâ geçerli', () => {
  expect(validateBackup({ app: 'jarvis', schemaVersion: 1, exportedAt: '', tables: { tasks: [] } }).ok).toBe(true)
})
