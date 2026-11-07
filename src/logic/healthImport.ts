import type { HealthDay } from '../db/types'
import { todayStr } from './dates'

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
  if (/^%(7b|5b)/i.test(text)) {
    try { text = decodeURIComponent(text) } catch { return { ok: false, error: ERR_READ } }
  }
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

// "2026-11-07 07:12:00 +0300" -> yerel zaman bilesenleri (ofset yok sayilir)
function parseLocal(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(s)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
}

export function aggregateExportLines(lines: Iterable<string>): HealthPatch[] {
  const sums = new Map<string, Partial<Record<Field, number>>>()
  const avgs = new Map<string, Partial<Record<'restingHr' | 'hrvMs', { sum: number; n: number }>>>()
  const row = <T>(m: Map<string, T>, date: string): T => {
    let r = m.get(date)
    if (!r) { r = {} as T; m.set(date, r) }
    return r
  }
  const SUM_TYPES: Record<string, Field> = {
    HKQuantityTypeIdentifierStepCount: 'steps',
    HKQuantityTypeIdentifierActiveEnergyBurned: 'activeKcal',
  }
  const AVG_TYPES: Record<string, 'restingHr' | 'hrvMs'> = {
    HKQuantityTypeIdentifierRestingHeartRate: 'restingHr',
    HKQuantityTypeIdentifierHeartRateVariabilitySDNN: 'hrvMs',
  }

  for (const line of lines) {
    if (!line.includes('<Record')) continue
    const attrs: Record<string, string> = {}
    for (const m of line.matchAll(/(\w+)="([^"]*)"/g)) attrs[m[1]] = m[2]
    const type = attrs.type
    if (!type) continue
    const start = attrs.startDate ? parseLocal(attrs.startDate) : null
    const end = attrs.endDate ? parseLocal(attrs.endDate) : null
    if (type in SUM_TYPES) {
      const v = toNum(attrs.value)
      if (!start || v === null) continue
      const r = row(sums, todayStr(start))
      const f = SUM_TYPES[type]
      r[f] = (r[f] ?? 0) + v
    } else if (type in AVG_TYPES) {
      const v = toNum(attrs.value)
      if (!start || v === null) continue
      const r = row(avgs, todayStr(start))
      const f = AVG_TYPES[type]
      const a = r[f] ?? (r[f] = { sum: 0, n: 0 })
      a.sum += v
      a.n++
    } else if (type === 'HKCategoryTypeIdentifierSleepAnalysis' && (attrs.value ?? '').includes('Asleep')) {
      if (!start || !end) continue
      const min = (end.getTime() - start.getTime()) / 60000
      if (!(min > 0)) continue
      const r = row(sums, todayStr(end))
      r.sleepMin = (r.sleepMin ?? 0) + min
    }
  }

  const dates = new Set([...sums.keys(), ...avgs.keys()])
  const out: HealthPatch[] = []
  for (const date of [...dates].sort()) {
    const raw: Record<string, unknown> = { ...sums.get(date) }
    const a = avgs.get(date)
    if (a) for (const f of ['restingHr', 'hrvMs'] as const) if (a[f]) raw[f] = a[f]!.sum / a[f]!.n
    const { fields } = sanitize(raw)
    if (Object.keys(fields).length) out.push({ date, ...fields })
  }
  return out
}
