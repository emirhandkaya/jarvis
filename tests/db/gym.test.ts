import { db } from '../../src/db/schema'
import { getSettings } from '../../src/db/repo/settings'
import { saveMorning } from '../../src/db/repo/checkins'
import {
  seedGymIfEmpty, startWorkout, logSet, updateSet, deleteSet, finishWorkout, exerciseHistory, gymStatus,
  weeklyVolume, addExercise, addTemplate, deleteTemplate,
} from '../../src/db/repo/gym'

beforeEach(async () => { await db.delete(); await db.open() })

test('ayar varsayilanlari', async () => {
  const s = await getSettings()
  expect(s.weeklyWorkoutTarget).toBe(3)
  expect(s.restSec).toBe(90)
})

test('seed 12 hareket ve 3 sablon olusturur, tekrar cagrilinca cogalmaz', async () => {
  await seedGymIfEmpty()
  await seedGymIfEmpty()
  expect(await db.exercises.count()).toBe(12)
  const ts = await db.templates.toArray()
  expect(ts).toHaveLength(3)
  expect(ts.every(t => t.items.length === 4 && t.items.every(i => i.sets === 3))).toBe(true)
  const ids = new Set((await db.exercises.toArray()).map(e => e.id))
  expect(ts.flatMap(t => t.items).every(i => ids.has(i.exerciseId))).toBe(true)
})

test('sablon ekle/sil', async () => {
  const e = await addExercise({ name: 'X', group: 'G', repMin: 8, repMax: 12, incrementKg: 2.5 })
  const t = await addTemplate('T', [{ exerciseId: e.id, sets: 3 }])
  expect(await db.templates.count()).toBe(1)
  await deleteTemplate(t.id)
  expect(await db.templates.count()).toBe(0)
})

test('set kaydi sirayla gelir, guncellenir ve silinir', async () => {
  const w = await startWorkout('2026-11-07')
  const a = await logSet(w.id, 'e1', 60, 10)
  const b = await logSet(w.id, 'e1', 60, 9)
  const c = await logSet(w.id, 'e2', 20, 12)
  expect([a.order, b.order, c.order]).toEqual([0, 1, 0])
  await updateSet(a.id, { reps: 11 })
  expect((await db.sets.get(a.id))!.reps).toBe(11)
  await deleteSet(b.id)
  expect(await db.sets.count()).toBe(2)
})

test('0 setli antrenman bitirilirse silinir', async () => {
  const w = await startWorkout('2026-11-07')
  expect(await finishWorkout(w.id)).toBe('discarded')
  expect(await db.workouts.get(w.id)).toBeUndefined()
  const w2 = await startWorkout('2026-11-07')
  await logSet(w2.id, 'e1', 60, 10)
  expect(await finishWorkout(w2.id)).toBe('saved')
  expect(await db.workouts.get(w2.id)).toBeDefined()
})

test('exerciseHistory: son iki antrenman dogru sirada, gecmis yoksa bos', async () => {
  expect(await exerciseHistory('e1')).toEqual({ last: [], prev: [] })
  const w1 = await startWorkout('2026-11-01')
  await logSet(w1.id, 'e1', 50, 8)
  const w3 = await startWorkout('2026-11-05')
  await logSet(w3.id, 'e1', 60, 10)
  await logSet(w3.id, 'e1', 60, 9)
  const w2 = await startWorkout('2026-11-03')
  await logSet(w2.id, 'e1', 55, 8)
  const h = await exerciseHistory('e1')
  expect(h.last.map(s => s.weightKg)).toEqual([60, 60])
  expect(h.prev.map(s => s.weightKg)).toEqual([55])
  const open = await startWorkout('2026-11-07')
  await logSet(open.id, 'e1', 65, 8)
  expect((await exerciseHistory('e1')).last.map(s => s.weightKg)).toEqual([65])
  const ex = await exerciseHistory('e1', open.id)
  expect(ex.last.map(s => s.weightKg)).toEqual([60, 60])
})

test('gymStatus haftalik sayim, hedef ve bugun', async () => {
  // 2026-11-07 Cumartesi; hafta 11-02..11-08
  for (const d of ['2026-11-01', '2026-11-03', '2026-11-07']) {
    const w = await startWorkout(d)
    await logSet(w.id, 'e1', 60, 10)
  }
  await startWorkout('2026-11-06') // setsiz, sayilmaz
  const s = await gymStatus('2026-11-07')
  expect(s).toMatchObject({ weekCount: 2, target: 3, deload: null, lastWorkoutDate: '2026-11-07', todayDone: true })
})

test('gymStatus: dusuk enerji -> yorgunluk, eski deload -> zaman', async () => {
  for (const d of ['2026-11-05', '2026-11-06', '2026-11-07']) await saveMorning(d, { energy: 2, priorities: [] })
  expect((await gymStatus('2026-11-07')).deload).toBe('yorgunluk')
  await db.checkins.clear()
  const w = await startWorkout('2026-09-20')
  await logSet(w.id, 'e1', 60, 10)
  expect((await gymStatus('2026-11-07')).deload).toBe('zaman')
  const d = await startWorkout('2026-11-01', undefined, true)
  await logSet(d.id, 'e1', 40, 10)
  expect((await gymStatus('2026-11-07')).deload).toBeNull()
})

test('weeklyVolume en eski hafta once', async () => {
  const w1 = await startWorkout('2026-10-27') // onceki hafta
  await logSet(w1.id, 'e1', 60, 10)
  const w2 = await startWorkout('2026-11-03')
  await logSet(w2.id, 'e1', 50, 8)
  expect(await weeklyVolume(3, '2026-11-07')).toEqual([0, 600, 400])
})

test('set sirasi silmeden sonra benzersiz kalir', async () => {
  const w = await startWorkout('2026-11-07')
  await logSet(w.id, 'e1', 60, 10)
  const mid = await logSet(w.id, 'e1', 60, 9)
  await logSet(w.id, 'e1', 60, 8)
  await deleteSet(mid.id)
  await logSet(w.id, 'e1', 60, 7)
  const orders = (await db.sets.toArray()).map(s => s.order)
  expect(new Set(orders).size).toBe(orders.length)
})
