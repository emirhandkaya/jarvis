import { db } from '../../src/db/schema'
import { addBlock, deleteBlock, blocksOn, updateBlock } from '../../src/db/repo/blocks'

beforeEach(async () => { await db.delete(); await db.open() })

test('bos baslik veya gecersiz aralik null doner', async () => {
  expect(await addBlock({ title: '  ', start: '09:00', end: '10:00', kind: 'is', date: '2026-11-09' })).toBeNull()
  expect(await addBlock({ title: 'a', start: '10:00', end: '10:00', kind: 'is', date: '2026-11-09' })).toBeNull()
})

test('tekrarli blok: sadece bugun sil skipDates ekler', async () => {
  const b = (await addBlock({ title: 'Ders', start: '09:00', end: '10:00', kind: 'ders', repeatDays: [1, 3] }))!
  await deleteBlock(b.id, 'day', '2026-11-09')
  expect((await db.blocks.get(b.id))?.skipDates).toEqual(['2026-11-09'])
  expect(await blocksOn('2026-11-09')).toHaveLength(0)
  expect(await blocksOn('2026-11-11')).toHaveLength(1)
})

test('tek seferlik day siler, series tekrarliyi siler', async () => {
  const o = (await addBlock({ title: 'a', start: '09:00', end: '10:00', kind: 'is', date: '2026-11-09' }))!
  await deleteBlock(o.id, 'day', '2026-11-09')
  expect(await db.blocks.count()).toBe(0)
  const r = (await addBlock({ title: 'r', start: '09:00', end: '10:00', kind: 'is', repeatDays: [1] }))!
  await deleteBlock(r.id, 'series')
  expect(await db.blocks.count()).toBe(0)
})

test('updateBlock', async () => {
  const o = (await addBlock({ title: 'a', start: '09:00', end: '10:00', kind: 'is', date: '2026-11-09' }))!
  await updateBlock(o.id, { start: '09:15' })
  expect((await db.blocks.get(o.id))?.start).toBe('09:15')
})
