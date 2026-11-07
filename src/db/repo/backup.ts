import { db } from '../schema'
import { SCHEMA_VERSION } from '../version'
import { setSetting } from './settings'
import { todayStr } from '../../logic/dates'
import { TABLE_NAMES, backupFileName, type BackupFile } from '../../logic/backup'

export async function exportAll(): Promise<BackupFile> {
  const tables: Record<string, unknown[]> = {}
  await db.transaction('r', db.tables, async () => {
    for (const name of TABLE_NAMES) tables[name] = await db.table(name).toArray()
  })
  return { app: 'jarvis', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), tables }
}

export async function importAll(file: BackupFile): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const name of TABLE_NAMES) {
      const table = db.table(name)
      await table.clear()
      const rows = file.tables[name]
      if (rows?.length) await table.bulkAdd(rows)
    }
  })
}

export async function downloadBackup(): Promise<void> {
  const file = await exportAll()
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupFileName(todayStr())
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  await setSetting('lastBackupAt', new Date().toISOString())
}
