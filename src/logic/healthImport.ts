import type { HealthDay } from '../db/types'


export type HealthPatch = { date: string } & Partial<Pick<HealthDay, 'sleepMin' | 'steps' | 'activeKcal' | 'restingHr' | 'hrvMs'>>

type Field = 'sleepMin' | 'steps' | 'activeKcal' | 'restingHr' | 'hrvMs'
const RANGES: Record<Field, [number, number]> = {
  sleepMin: [0, 1440],
  steps: [0, 100000],
  activeKcal: [0, 10000],
  restingHr: [20, 250],
  hrvMs: [1, 300],
}
const FIELDS = Object.keys(RANGES) as Field[]
const MAX_ITEMS = 400
const ERR_READ = 'Veri okunamadı'
const ERR_EMPTY = 'Geçerli kayıt yok'

function toNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function sanitize(raw: Record<string, unknown>): { fields: Partial<Record<Field, number>>; dropped: number } {
  const fields: Partial<Record<Field, number>> = {}
  let dropped = 0
  for (const f of FIELDS) {
    if (raw[f] === undefined || raw[f] === null) continue
    const n = toNum(raw[f])
    const [lo, hi] = RANGES[f]
    if (n === null || n < lo || n > hi) { dropped++; continue }
    fields[f] = Math.round(n)
  }
  return { fields, dropped }
}

function validDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

function base64UrlToString(s: string): string | null {
  if (!s || !/^[A-Za-z0-9_\-+/]+={0,2}$/.test(s)) return null
  let b = s.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')
  if (b.length % 4 === 1) return null
  while (b.length % 4) b += '='
  try {
    const bin = atob(b)
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

export function decodeHealthParam(
  d: string,
  today: string,
): { ok: true; days: HealthPatch[]; dropped: number } | { ok: false; error: string } {
  let text = (d ?? '').trim()
  // Kısayollar %-kodlu / satır sonlu base64 üretebilir.
  try { text = decodeURIComponent(text) } catch { /* ham haliyle dene */ }
  text = text.trim()
  if (!/^[{[]/.test(text)) text = text.replace(/\s+/g, '')
  if (!/^[{[]/.test(text)) {
    const dec = base64UrlToString(text)
    if (dec === null) return { ok: false, error: ERR_READ }
    text = dec
  }
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { return { ok: false, error: ERR_READ } }
  const items = Array.isArray(parsed) ? parsed : [parsed]
  if (items.length > MAX_ITEMS) return { ok: false, error: ERR_READ }

  const days: HealthPatch[] = []
  let dropped = 0
  for (const it of items) {
    if (!it || typeof it !== 'object' || Array.isArray(it)) continue
    const raw = it as Record<string, unknown>
    const date = raw.date === undefined ? today : raw.date
    if (!validDate(date) || date > today) { dropped++; continue }
    const { fields, dropped: dr } = sanitize(raw)
    dropped += dr
    if (Object.keys(fields).length) days.push({ date, ...fields })
  }
  if (!days.length) return { ok: false, error: ERR_EMPTY }
  return { ok: true, days, dropped }
}

export function encodeHealthParam(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj))
  let bin = ''
  bytes.forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

interface Stamp { abs: number; local: number } // abs: gercek an (ms), local: yerel duvar saati (UTC gibi kodlanmis ms)

// "2026-11-07 07:12:00 +0300" -> mutlak an + yerel bilesenler
function parseStamp(s: string): Stamp | null {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?: ([+-])(\d{2})(\d{2}))?/.exec(s)
  if (!m) return null
  const local = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
  const off = m[7] ? (m[7] === '-' ? -1 : 1) * (+m[8] * 60 + +m[9]) * 60000 : 0
  return { abs: local - off, local }
}

const dayKey = (localMs: number): string => new Date(localMs).toISOString().slice(0, 10)
// Genel gun: 04:00 baslangici
const dayOf = (st: Stamp) => dayKey(st.local - 4 * 3600000)
// Uyku gecesi: bitis + 6 saatin takvim gunu (uyanma gunu)
const sleepDayOf = (end: Stamp) => dayKey(end.local + 6 * 3600000)

export function createExportAggregator(): { push(line: string): void; result(): HealthPatch[] } {
  const sums = new Map<string, Partial<Record<'steps' | 'activeKcal', Map<string, number>>>>() // alan -> kaynak -> toplam
  const avgs = new Map<string, Partial<Record<'restingHr' | 'hrvMs', { sum: number; n: number }>>>()
  const sleeps = new Map<string, [number, number][]>()
  const row = <T>(m: Map<string, T>, date: string): T => {
    let r = m.get(date)
    if (!r) { r = {} as T; m.set(date, r) }
    return r
  }
  const SUM_TYPES: Record<string, 'steps' | 'activeKcal'> = {
    HKQuantityTypeIdentifierStepCount: 'steps',
    HKQuantityTypeIdentifierActiveEnergyBurned: 'activeKcal',
  }
  const AVG_TYPES: Record<string, 'restingHr' | 'hrvMs'> = {
    HKQuantityTypeIdentifierRestingHeartRate: 'restingHr',
    HKQuantityTypeIdentifierHeartRateVariabilitySDNN: 'hrvMs',
  }

  const push = (line: string): void => {
    if (!line.includes('<Record')) return
    const attrs: Record<string, string> = {}
    for (const m of line.matchAll(/(\w+)="([^"]*)"/g)) attrs[m[1]] = m[2]
    const type = attrs.type
    if (!type) return
    const start = attrs.startDate ? parseStamp(attrs.startDate) : null
    const end = attrs.endDate ? parseStamp(attrs.endDate) : null
    if (type in SUM_TYPES) {
      const v = toNum(attrs.value)
      if (!start || v === null) return
      const f = SUM_TYPES[type]
      const bySrc = (row(sums, dayOf(start))[f] ??= new Map())
      const src = attrs.sourceName ?? ''
      bySrc.set(src, (bySrc.get(src) ?? 0) + v)
    } else if (type in AVG_TYPES) {
      const v = toNum(attrs.value)
      if (!start || v === null) return
      const r = row(avgs, dayOf(start))
      const f = AVG_TYPES[type]
      const a = (r[f] ??= { sum: 0, n: 0 })
      a.sum += v
      a.n++
    } else if (type === 'HKCategoryTypeIdentifierSleepAnalysis' && (attrs.value ?? '').includes('Asleep')) {
      if (!start || !end || !(end.abs > start.abs)) return
      const list = sleeps.get(sleepDayOf(end)) ?? []
      list.push([start.abs, end.abs])
      sleeps.set(sleepDayOf(end), list)
    }
  }

  const result = (): HealthPatch[] => {
    const dates = new Set([...sums.keys(), ...avgs.keys(), ...sleeps.keys()])
    const out: HealthPatch[] = []
    for (const date of [...dates].sort()) {
      const raw: Record<string, unknown> = {}
      const s = sums.get(date)
      if (s) for (const f of ['steps', 'activeKcal'] as const) if (s[f]) raw[f] = Math.max(...s[f]!.values())
      const a = avgs.get(date)
      if (a) for (const f of ['restingHr', 'hrvMs'] as const) if (a[f]) raw[f] = a[f]!.sum / a[f]!.n
      const iv = sleeps.get(date)
      if (iv) {
        iv.sort((x, y) => x[0] - y[0])
        let total = 0
        let [cs, ce] = iv[0]
        for (const [s2, e2] of iv.slice(1)) {
          if (s2 <= ce) ce = Math.max(ce, e2)
          else { total += ce - cs; cs = s2; ce = e2 }
        }
        total += ce - cs
        raw.sleepMin = total / 60000
      }
      const { fields } = sanitize(raw)
      if (Object.keys(fields).length) out.push({ date, ...fields })
    }
    return out
  }

  return { push, result }
}

export function aggregateExportLines(lines: Iterable<string>): HealthPatch[] {
  const agg = createExportAggregator()
  for (const l of lines) agg.push(l)
  return agg.result()
}
