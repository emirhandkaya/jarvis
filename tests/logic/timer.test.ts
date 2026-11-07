import { advance, remainingSec, totalWorkSec, currentTopic, isStale, nextPhase, phaseMinutes, type ActiveTimer } from '../../src/logic/timer'

const cfg = { work: 25, short: 5, long: 15, longEvery: 4 }
const at = (h: number, m: number) => new Date(2026, 10, 7, h, m)
const base = (o: Partial<ActiveTimer> = {}): ActiveTimer => ({
  mode: 'pomodoro', startedAt: at(10, 0).toISOString(), phase: 'work', phaseStartedAt: at(10, 0).toISOString(),
  round: 1, workSec: 0, paused: false, topicIds: [], ...o,
})

test('faz süreleri ve sıra', () => {
  expect(phaseMinutes('long', cfg)).toBe(15)
  expect(nextPhase('work', 3, cfg)).toEqual({ phase: 'short', round: 3 })
  expect(nextPhase('work', 4, cfg)).toEqual({ phase: 'long', round: 4 })
  expect(nextPhase('short', 1, cfg)).toEqual({ phase: 'work', round: 2 })
})
test('10:10 kalan 900 sn', () => { expect(remainingSec(base(), at(10, 10), cfg)).toBe(900) })
test('10:27 mola', () => {
  const r = advance(base(), at(10, 27), cfg)
  expect(r.timer.phase).toBe('short'); expect(r.timer.round).toBe(1); expect(r.timer.workSec).toBe(1500)
  expect(r.finishedPhases).toEqual(['work'])
})
test('11:52 dördüncü tur', () => {
  const r = advance(base(), at(11, 52), cfg)
  expect(r.timer.phase).toBe('work'); expect(r.timer.round).toBe(4); expect(r.timer.workSec).toBe(4500)
  expect(totalWorkSec(r.timer, at(11, 52), cfg)).toBe(4500 + 22 * 60)
})
test('11:56 uzun mola', () => { expect(advance(base(), at(11, 56), cfg).timer.phase).toBe('long') })
test('serbest', () => {
  const t = base({ mode: 'serbest' })
  expect(remainingSec(t, at(10, 10), cfg)).toBe(600)
  expect(advance(t, at(12, 0), cfg).timer.phase).toBe('work')
})
test('duraklatılmış değişmez', () => {
  const t = base({ paused: true, pausedAt: at(10, 5).toISOString() })
  expect(advance(t, at(12, 0), cfg).timer).toEqual(t)
})
test('karışık konu', () => {
  const t = (round: number) => base({ mode: 'karisik', topicIds: ['a', 'b'], round })
  expect([1, 2, 3].map(r => currentTopic(t(r)))).toEqual(['a', 'b', 'a'])
  expect(currentTopic(base())).toBeUndefined()
})
test('isStale', () => {
  expect(isStale(base(), at(14, 0))).toBe(false)
  expect(isStale(base(), at(14, 1))).toBe(true)
})
test('sıfır süreli faz sonsuz döngüye girmez', () => {
  const r = advance(base(), at(10, 5), { work: 0, short: 0, long: 0, longEvery: 4 })
  expect(r.finishedPhases.length).toBe(5)
})
