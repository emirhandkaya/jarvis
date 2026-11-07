import { db } from '../../src/db/schema'
import { addCourse } from '../../src/db/repo/courses'
import { addTopic } from '../../src/db/repo/topics'
import { startTimer, getActiveTimer, pauseTimer, resumeTimer, finishTimer } from '../../src/db/repo/focus'

beforeEach(async () => { await db.delete(); await db.open() })
const at = (h: number, m: number, s = 0) => new Date(2026, 10, 7, h, m, s)

test('startTimer round-trip', async () => {
  const t = await startTimer({ mode: 'pomodoro', topicIds: [] }, at(10, 0))
  expect(await getActiveTimer()).toEqual(t)
})
test('pause/resume kaydırır', async () => {
  await startTimer({ mode: 'pomodoro', topicIds: [] }, at(10, 0))
  await pauseTimer(at(10, 5))
  await resumeTimer(at(10, 15))
  const t = (await getActiveTimer())!
  expect(t.paused).toBe(false)
  expect(new Date(t.phaseStartedAt).getTime()).toBe(at(10, 10).getTime())
})
test('30 sn sonra bitirme kaydetmez', async () => {
  await startTimer({ mode: 'serbest', topicIds: [] }, at(10, 0))
  expect(await finishTimer(at(10, 0, 30), { recall: [], ratings: {} })).toBeNull()
  expect(await db.focusSessions.count()).toBe(0)
  expect(await getActiveTimer()).toBeNull()
})
test('25 dk seans kaydı, recall ve konu aşaması', async () => {
  const c = (await addCourse('Fizik'))!
  const top = (await addTopic(c.id, 'a'))!
  await startTimer({ mode: 'pomodoro', courseId: c.id, topicIds: [top.id] }, at(10, 0))
  const s = await finishTimer(at(10, 25), { recall: ['a', ' ', 'b', 'c', 'd'], ratings: { [top.id]: 'kolay' } })
  expect(s?.minutes).toBe(25)
  expect(s?.recall).toEqual(['a', 'b', 'c'])
  expect(s?.rating).toBe('kolay')
  expect((await db.topics.get(top.id))!.stage).toBe(1)
  expect(await getActiveTimer()).toBeNull()
})
test('kapalıyken biten fazlar sayılır: 10:00-10:40 = 35 dk', async () => {
  await startTimer({ mode: 'pomodoro', topicIds: [] }, at(10, 0))
  const s = await finishTimer(at(10, 40), { recall: [], ratings: {} })
  expect(s?.minutes).toBe(35)
})
