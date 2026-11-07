import { decodeHealthParam, encodeHealthParam, aggregateExportLines } from '../../src/logic/healthImport'

const TODAY = '2026-11-07'

test('encode/decode gidis donus, sayisal string sayiya cevrilir', () => {
  const r = decodeHealthParam(encodeHealthParam({ date: '2026-11-07', sleepMin: 420, steps: '8000' }), TODAY)
  expect(r).toEqual({ ok: true, days: [{ date: '2026-11-07', sleepMin: 420, steps: 8000 }], dropped: 0 })
})
test('UTF-8 icerik cozulur', () => {
  const r = decodeHealthParam(encodeHealthParam({ date: '2026-11-07', steps: 1, note: 'şğü' }), TODAY)
  expect(r.ok).toBe(true)
})
test('iki gunluk dizi', () => {
  const r = decodeHealthParam(encodeHealthParam([{ date: '2026-11-06', steps: 1 }, { date: '2026-11-07', steps: 2 }]), TODAY)
  expect(r.ok && r.days.length).toBe(2)
})
test('aralik disi alan dusurulur', () => {
  const r = decodeHealthParam(encodeHealthParam({ steps: 999999, sleepMin: 400 }), TODAY)
  expect(r).toEqual({ ok: true, days: [{ date: TODAY, sleepMin: 400 }], dropped: 1 })
})
test('gelecek tarih reddedilir', () => {
  const r = decodeHealthParam(encodeHealthParam([{ date: '2026-11-08', steps: 5 }, { date: '2026-11-07', steps: 6 }]), TODAY)
  expect(r.ok && r.days).toEqual([{ date: '2026-11-07', steps: 6 }])
  const only = decodeHealthParam(encodeHealthParam({ date: '2027-01-01', steps: 5 }), TODAY)
  expect(only).toEqual({ ok: false, error: 'Geçerli kayıt yok' })
})
test('garip tarih reddedilir', () => {
  const r = decodeHealthParam(encodeHealthParam({ date: '2026-13-45', steps: 5 }), TODAY)
  expect(r.ok).toBe(false)
})
test('bozuk girdiler', () => {
  expect(decodeHealthParam('%%%', TODAY)).toEqual({ ok: false, error: 'Veri okunamadı' })
  expect(decodeHealthParam('', TODAY)).toEqual({ ok: false, error: 'Veri okunamadı' })
  expect(decodeHealthParam('bm90IGpzb24', TODAY)).toEqual({ ok: false, error: 'Veri okunamadı' })
  expect(decodeHealthParam('{}', TODAY)).toEqual({ ok: false, error: 'Geçerli kayıt yok' })
  expect(decodeHealthParam('[1,"a",null]', TODAY)).toEqual({ ok: false, error: 'Geçerli kayıt yok' })
})
test('cok fazla kayit', () => {
  const many = Array.from({ length: 401 }, () => ({ steps: 1 }))
  expect(decodeHealthParam(encodeHealthParam(many), TODAY).ok).toBe(false)
})
test('duz JSON ve URL-encoded JSON kabul edilir', () => {
  expect(decodeHealthParam('{"steps":10}', TODAY)).toMatchObject({ ok: true })
  expect(decodeHealthParam(encodeURIComponent('{"steps":10}'), TODAY)).toMatchObject({ ok: true })
})
test('tarih yoksa bugun', () => {
  const r = decodeHealthParam(encodeHealthParam({ steps: 10 }), TODAY)
  expect(r.ok && r.days[0].date).toBe(TODAY)
})
test('aggregateExportLines', () => {
  const lines = [
    '<Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-11-07 08:00:00 +0300" endDate="2026-11-07 08:10:00 +0300" value="1000"/>',
    '<Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-11-07 12:00:00 +0300" endDate="2026-11-07 12:10:00 +0300" value="500"/>',
    '<Record type="HKCategoryTypeIdentifierSleepAnalysis" startDate="2026-11-06 23:30:00 +0300" endDate="2026-11-07 06:30:00 +0300" value="HKCategoryValueSleepAnalysisAsleepCore"/>',
    '<Record type="HKCategoryTypeIdentifierSleepAnalysis" startDate="2026-11-05 23:30:00 +0300" endDate="2026-11-06 06:30:00 +0300" value="HKCategoryValueSleepAnalysisInBed"/>',
    '<Record type="HKQuantityTypeIdentifierRestingHeartRate" startDate="2026-11-07 09:00:00 +0300" endDate="2026-11-07 09:00:00 +0300" value="60"/>',
    '<Record type="HKQuantityTypeIdentifierRestingHeartRate" startDate="2026-11-07 10:00:00 +0300" endDate="2026-11-07 10:00:00 +0300" value="63"/>',
    '<Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-11-07 09:00:00 +0300" endDate="2026-11-07 09:00:00 +0300" value="70"/>',
    '<Workout foo="bar"/>',
  ]
  expect(aggregateExportLines(lines)).toEqual([
    { date: '2026-11-07', steps: 1500, sleepMin: 420, restingHr: 62 },
  ])
})
