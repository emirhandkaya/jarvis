import { db } from '../../src/db/schema'
import { saveReview, isWeekReviewed, applyRestart } from '../../src/db/repo/reviews'
import { addCourse } from '../../src/db/repo/courses'
import { getSettings, setSetting } from '../../src/db/repo/settings'

beforeEach(async () => { await db.delete(); await db.open() })

const f = (t: string) => ({ wentWell: t, toImprove: '', nextFocus: '', goalIds: [] })

test('saveReview upsert: tek satir, createdAt korunur', async () => {
  await saveReview('2026-11-02', f('a'))
  const first = (await db.reviews.get('2026-11-02'))!
  await new Promise(r => setTimeout(r, 5))
  await saveReview('2026-11-02', f('b'))
  const rows = await db.reviews.toArray()
  expect(rows).toHaveLength(1)
  expect(rows[0].wentWell).toBe('b')
  expect(rows[0].createdAt).toBe(first.createdAt)
})

test('isWeekReviewed haftanin herhangi gunu icin', async () => {
  expect(await isWeekReviewed('2026-11-08')).toBe(false)
  await saveReview('2026-11-02', f('a'))
  expect(await isWeekReviewed('2026-11-08')).toBe(true)
  expect(await isWeekReviewed('2026-11-09')).toBe(false)
})

test('applyRestart hedefleri kucultur', async () => {
  await addCourse('A', { weeklyTargetMin: 300 })
  await setSetting('weeklyWorkoutTarget', 3)
  await applyRestart()
  expect((await db.courses.toArray())[0].weeklyTargetMin).toBe(210)
  expect((await getSettings()).weeklyWorkoutTarget).toBe(2)
})
