import { db } from '../../src/db/schema'
import { getSettings, setSetting } from '../../src/db/repo/settings'

beforeEach(async () => { await db.delete(); await db.open() })

test('ayar varsayılanları ve yazma', async () => {
  expect((await getSettings()).wakeTime).toBe('07:00')
  await setSetting('wakeTime', '06:30')
  expect((await getSettings()).wakeTime).toBe('06:30')
  expect((await getSettings()).pomodoro.work).toBe(25)
})
