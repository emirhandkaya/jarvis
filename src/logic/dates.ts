export const DAY_START_HOUR = 4

const pad = (n: number) => String(n).padStart(2, '0')

function fmt(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayStr(now: Date = new Date()): string {
  return fmt(new Date(now.getTime() - DAY_START_HOUR * 3600 * 1000))
}

export function addDays(date: string, n: number): string {
  const d = parse(date)
  d.setDate(d.getDate() + n)
  return fmt(d)
}

export function weekStart(date: string): string {
  const dow = parse(date).getDay() // 0 = pazar
  return addDays(date, -((dow + 6) % 7))
}

export function isSunday(date: string): boolean {
  return parse(date).getDay() === 0
}

export function diffDays(a: string, b: string): number {
  const da = parse(a)
  const db = parse(b)
  return Math.round(
    (Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) -
      Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) / 86400000,
  )
}

export function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
