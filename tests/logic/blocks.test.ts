import {
  toMin, toHHMM, snap, blocksForDay, layoutDay, moveBlock, resizeBlock,
  currentOrNext, capacity, peakWindow, suggestSlot,
} from '../../src/logic/blocks'
import type { Block, FocusSession, Task } from '../../src/db/types'

const blk = (o: Partial<Block> & Pick<Block, 'start' | 'end'>): Block => ({
  id: o.title ?? o.start, createdAt: '', updatedAt: '', title: 'x', kind: 'is', ...o,
})
const task = (o: Partial<Task>): Task => ({
  id: 't', createdAt: '', updatedAt: '', title: 't', tag: 'is', priority: 2, energy: 'low', ...o,
})

test('toMin / toHHMM / snap', () => {
  expect(toMin('07:30')).toBe(450)
  expect(toMin('24:00')).toBe(1440)
  expect(toHHMM(1440)).toBe('24:00')
  expect(toHHMM(450)).toBe('07:30')
  expect(snap(52)).toBe(45)
  expect(snap(53)).toBe(60)
})

test('blocksForDay: tekrar, skipDates, tek seferlik', () => {
  const rec = blk({ id: 'r', title: 'r', start: '10:00', end: '11:00', repeatDays: [1, 3], skipDates: ['2026-11-09'] })
  const one = blk({ id: 'o', title: 'o', start: '09:00', end: '09:30', date: '2026-11-09' })
  const all = [rec, one]
  expect(blocksForDay(all, '2026-11-09').map(b => b.id)).toEqual(['o'])
  expect(blocksForDay(all, '2026-11-11').map(b => b.id)).toEqual(['r'])
  expect(blocksForDay(all, '2026-11-10')).toEqual([])
})

test('layoutDay: yan yana kolonlar', () => {
  const a = blk({ title: 'A', start: '09:00', end: '10:00' })
  const b = blk({ title: 'B', start: '09:30', end: '10:30' })
  const c = blk({ title: 'C', start: '10:30', end: '11:00' })
  const l = layoutDay([c, b, a])
  const f = (t: string) => l.find(x => x.block.title === t)!
  expect([f('A').col, f('A').cols]).toEqual([0, 2])
  expect([f('B').col, f('B').cols]).toEqual([1, 2])
  expect([f('C').col, f('C').cols]).toEqual([0, 1])
})

test('moveBlock kenarlara kenetlenir', () => {
  expect(moveBlock({ start: '23:00', end: '23:45' }, 60)).toEqual({ start: '23:15', end: '24:00' })
  expect(moveBlock({ start: '06:15', end: '07:00' }, -40)).toEqual({ start: '06:00', end: '06:45' })
})

test('resizeBlock minimum 15 dk ve ust sinir', () => {
  expect(resizeBlock({ start: '10:00', end: '10:30' }, -60).end).toBe('10:15')
  expect(resizeBlock({ start: '23:00', end: '23:30' }, 120).end).toBe('24:00')
})

test('currentOrNext', () => {
  const a = blk({ title: 'A', start: '09:00', end: '10:00' })
  const b = blk({ title: 'B', start: '12:00', end: '13:00' })
  expect(currentOrNext([a, b], 570)).toMatchObject({ state: 'now', block: { title: 'A' } })
  expect(currentOrNext([a, b], 660)).toMatchObject({ state: 'next', block: { title: 'B' } })
  expect(currentOrNext([a, b], 900)).toBeNull()
})

test('capacity', () => {
  const day = [
    blk({ id: 'b1', title: 'b1', start: '08:00', end: '18:00', refId: 'tk' }), // 600
    blk({ id: 'm', title: 'm', start: '12:00', end: '13:00', kind: 'mola' }),
  ]
  const tasks = [task({ id: 'tk', estimateMin: 90 })]
  expect(capacity(day, tasks, '07:00', '23:00')).toEqual({ plannedMin: 600, awakeMin: 960, over: false })
  const more = [...day, blk({ id: 'b2', title: 'b2', start: '19:00', end: '21:00' })]
  const r = capacity(more, tasks, '07:00', '23:00')
  expect(r.plannedMin).toBe(720)
  expect(r.over).toBe(true)
  expect(capacity([], [], '23:00', '07:00').awakeMin).toBe(480)
})

const sess = (day: number, hour: number): FocusSession => ({
  id: `${day}-${hour}`, createdAt: '', updatedAt: '',
  startedAt: new Date(2026, 10, day, hour, 0).toISOString(),
  endedAt: new Date(2026, 10, day, hour, 50).toISOString(),
  minutes: 50, mode: 'serbest', topicIds: [], recall: [],
})

test('peakWindow', () => {
  const many: FocusSession[] = []
  for (let d = 1; d <= 8; d++) many.push(sess(d, 10), sess(d, 11))
  expect(peakWindow(many, '2026-11-09')).toEqual({ start: '10:00', end: '12:00', fromData: true })
  const few: FocusSession[] = []
  for (let d = 1; d <= 3; d++) few.push(sess(d, 14))
  expect(peakWindow(few, '2026-11-09')).toEqual({ start: '09:00', end: '11:00', fromData: false })
})

test('suggestSlot', () => {
  const day = [blk({ start: '09:00', end: '10:00' })]
  const win = { start: '09:00', end: '11:00' }
  expect(suggestSlot(day, 60, win, 360)).toBe('10:00')
  const full = [blk({ start: '09:00', end: '11:00' })]
  expect(suggestSlot(full, 60, win, 360)).toBe('06:00')
  expect(suggestSlot(full, 60, win, 600)).toBe('11:00')
  expect(suggestSlot([blk({ start: '06:00', end: '24:00' })], 60, win, 360)).toBeNull()
})
