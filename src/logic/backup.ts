import { SCHEMA_VERSION } from '../db/version'
import { diffDays, todayStr } from './dates'

export interface BackupFile {
  app: 'jarvis'
  schemaVersion: number
  exportedAt: string
  tables: Record<string, unknown[]>
}

export const TABLE_NAMES = [
  'settings', 'checkins', 'goals', 'tasks', 'courses', 'topics', 'focusSessions', 'exercises',
  'templates', 'workouts', 'sets', 'habits', 'habitLogs', 'blocks', 'health', 'reviews', 'mockExams',
] as const

export type BackupResult =
  | { ok: true; file: BackupFile; counts: Record<string, number> }
  | { ok: false; error: string }

export function validateBackup(json: unknown): BackupResult {
  if (!json || typeof json !== 'object') return { ok: false, error: 'Dosya geçerli bir yedek değil.' }
  const f = json as Record<string, unknown>
  if (f.app !== 'jarvis') return { ok: false, error: 'Bu dosya bir Jarvis yedeği değil.' }
  if (typeof f.schemaVersion !== 'number' || f.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: 'Yedek daha yeni bir sürümden; uygulamayı güncelle.' }
  }
  if (!f.tables || typeof f.tables !== 'object' || Array.isArray(f.tables)) {
    return { ok: false, error: 'Yedekte tablo verisi yok.' }
  }
  const counts: Record<string, number> = {}
  for (const [name, rows] of Object.entries(f.tables)) {
    if (!(TABLE_NAMES as readonly string[]).includes(name)) return { ok: false, error: `Bilinmeyen tablo: ${name}` }
    if (!Array.isArray(rows)) return { ok: false, error: `Tablo bozuk: ${name}` }
    counts[name] = rows.length
  }
  return { ok: true, file: f as unknown as BackupFile, counts }
}

export function backupFileName(date: string): string {
  return `jarvis-yedek-${date}.json`
}

export function needsBackupReminder(lastBackupAt: string | null, today: string): boolean {
  if (!lastBackupAt) return true
  return diffDays(todayStr(new Date(lastBackupAt)), today) >= 7
}
