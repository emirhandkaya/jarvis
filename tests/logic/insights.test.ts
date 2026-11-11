import { compare, computeInsights, buildDayRecords, type DayRecord } from '../../src/logic/insights'
import { emptyStatsInput } from '../../src/logic/stats'
import { addDays } from '../../src/logic/dates'

const rep = (n: number, v: number) => Array<number>(n).fill(v)

test('compare esikleri', () => {
  expect(compare(rep(7, 12), rep(7, 10))!.diffPct).toBeCloseTo(20)
  expect(compare(rep(6, 12), rep(7, 10))).toBeNull()
  expect(compare(rep(7, 11.5), rep(7, 10))).toBeNull()
  expect(compare(rep(7, 5), rep(7, 0))).toBeNull()
})

const rec = (i: number, p: Partial<DayRecord>): DayRecord => ({ date: addDays('2026-10-01', i), focusMin: 0, workout: false, ...p })

test('uyku-odak: 8 vs 8 gun %50 daha fazla; yetersizse bos', () => {
  const recs = [
    ...Array.from({ length: 8 }, (_, i) => rec(i, { sleepH: 8, focusMin: 60 })),
    ...Array.from({ length: 8 }, (_, i) => rec(i + 8, { sleepH: 6, focusMin: 40 })),
  ]
  const out = computeInsights(recs, [], '2026-10-31')
  expect(out.find(i => i.id === 'uyku-odak')!.text).toContain('%50 daha fazla')
  expect(computeInsights(recs.slice(0, 10), [], '2026-10-31')).toEqual([])
})

test('spor-enerji: ertesi gun enerji', () => {
  const recs: DayRecord[] = []
  for (let i = 0; i < 40; i += 2) {
    const w = i % 4 === 0
    recs.push(rec(i, { workout: w }), rec(i + 1, { energy: w ? 4 : 3 }))
  }
  const t = computeInsights(recs, [], '2026-11-15').find(i => i.id === 'spor-enerji')!.text
  expect(t).toBe('Spor yaptığın günün ertesinde enerjin %33 daha yüksek')
})

test('buildDayRecords bos girdi', () => {
  const r = buildDayRecords(emptyStatsInput(), '2026-11-08', 60)
  expect(r).toHaveLength(60)
  expect(r.every(x => x.focusMin === 0 && !x.workout)).toBe(true)
})

test('buildDayRecords dune kadar uzanir, bugunu icermez', () => {
  const r = buildDayRecords(emptyStatsInput(), '2026-11-08', 60)
  expect(r[r.length - 1].date).toBe('2026-11-07')
})
