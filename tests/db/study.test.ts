import { db } from '../../src/db/schema'
import { addCourse, deleteCourse } from '../../src/db/repo/courses'
import { addTopic, reviewTopic, dueTopicsWithCourse } from '../../src/db/repo/topics'

beforeEach(async () => { await db.delete(); await db.open() })

test('boş ders adı eklenmez', async () => {
  expect(await addCourse('   ')).toBeNull()
  expect(await db.courses.count()).toBe(0)
})
test('ders silinince konular arşivlenir, seanslar kalır, vadesi gelmez', async () => {
  const c = (await addCourse('Fizik'))!
  const t1 = (await addTopic(c.id, 'a'))!
  const t2 = (await addTopic(c.id, 'b'))!
  await db.topics.update(t1.id, { nextReviewDate: '2026-11-01' })
  await db.topics.update(t2.id, { nextReviewDate: '2026-11-01' })
  await db.focusSessions.add({ id: 's', createdAt: '', updatedAt: '', startedAt: '', endedAt: '', minutes: 25, mode: 'serbest', courseId: c.id, topicIds: [], recall: [] })
  await db.mockExams.add({ id: 'm', createdAt: '', updatedAt: '', courseId: c.id, date: '2026-11-01', score: 50 })
  expect((await dueTopicsWithCourse('2026-11-07')).length).toBe(2)
  await deleteCourse(c.id)
  expect(await db.courses.count()).toBe(0)
  expect((await db.topics.toArray()).every(t => t.archived)).toBe(true)
  expect(await db.focusSessions.count()).toBe(1)
  expect(await db.mockExams.count()).toBe(0)
  expect(await dueTopicsWithCourse('2026-11-07')).toEqual([])
})
test('sahipsiz konu vadeli görünmez', async () => {
  const t = (await addTopic('yok', 'x'))!
  await db.topics.update(t.id, { nextReviewDate: '2026-11-01' })
  expect(await dueTopicsWithCourse('2026-11-07')).toEqual([])
})
test('reviewTopic kolay: aşama 1, +3 gün', async () => {
  const c = (await addCourse('Fizik'))!
  const t = (await addTopic(c.id, 'a'))!
  await reviewTopic(t.id, 'kolay', '2026-11-07')
  const got = (await db.topics.get(t.id))!
  expect(got.stage).toBe(1)
  expect(got.nextReviewDate).toBe('2026-11-10')
})
