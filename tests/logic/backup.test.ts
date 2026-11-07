import { validateBackup, backupFileName, needsBackupReminder } from '../../src/logic/backup'

test('geçersiz dosyalar reddedilir', () => {
  expect(validateBackup(null).ok).toBe(false)
  expect(validateBackup({ app: 'baska', schemaVersion: 1, tables: {} }).ok).toBe(false)
  expect(validateBackup({ app: 'jarvis', schemaVersion: 99, tables: {} }).ok).toBe(false)
  expect(validateBackup({ app: 'jarvis', schemaVersion: 1, tables: { tasks: 'x' } }).ok).toBe(false)
  expect(validateBackup({ app: 'jarvis', schemaVersion: 1, tables: { bilinmeyen: [] } }).ok).toBe(false)
})
test('geçerli dosya kabul edilir ve sayar', () => {
  const r = validateBackup({ app: 'jarvis', schemaVersion: 1, exportedAt: '', tables: { tasks: [{}, {}] } })
  expect(r.ok && r.counts.tasks).toBe(2)
})
test('dosya adı ve hatırlatma', () => {
  expect(backupFileName('2026-11-07')).toBe('jarvis-yedek-2026-11-07.json')
  expect(needsBackupReminder(null, '2026-11-07')).toBe(true)
  expect(needsBackupReminder('2026-11-01T10:00:00Z', '2026-11-07')).toBe(false)
  expect(needsBackupReminder('2026-10-31T10:00:00Z', '2026-11-07')).toBe(true)
})
