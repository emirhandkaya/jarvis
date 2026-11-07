import { useEffect, useRef, useState } from 'preact/hooks'
import { useSettings, setSetting, DEFAULT_SETTINGS } from '../../db/repo/settings'
import { downloadBackup, importAll } from '../../db/repo/backup'
import { isPersisted } from '../../db/persist'
import { validateBackup, type BackupFile } from '../../logic/backup'
import { Page } from '../../ui/Page'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { ShortcutsGuide } from './ShortcutsGuide'

type Pending = { file: BackupFile; counts: Record<string, number> }

function PomoField({ label, k }: { label: string; k: 'work' | 'short' | 'long' | 'longEvery' }) {
  const s = useSettings()
  const p = s?.pomodoro ?? DEFAULT_SETTINGS.pomodoro
  return (
    <label class="row">
      <span class="grow">{label}</span>
      <input
        type="number" inputMode="numeric" min={1} style="width: 80px" value={p[k]}
        onChange={e => {
          const n = parseInt((e.target as HTMLInputElement).value, 10)
          if (Number.isFinite(n) && n > 0) setSetting('pomodoro', { ...p, [k]: n })
        }}
      />
    </label>
  )
}

export function SettingsPage() {
  const s = useSettings()
  const [persisted, setPersisted] = useState<boolean>()
  const [pending, setPending] = useState<Pending | null>(null)
  const [msg, setMsg] = useState<{ error: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { isPersisted().then(setPersisted) }, [])

  const pick = async (e: Event) => {
    const input = e.target as HTMLInputElement
    const f = input.files?.[0]
    input.value = ''
    setPending(null)
    if (!f) return
    let json: unknown
    try { json = JSON.parse(await f.text()) } catch {
      return setMsg({ error: true, text: 'Dosya okunamadı: geçerli bir JSON değil.' })
    }
    const r = validateBackup(json)
    if (!r.ok) return setMsg({ error: true, text: r.error })
    setMsg(null)
    setPending({ file: r.file, counts: r.counts })
  }

  const restore = async () => {
    if (!pending) return
    try {
      await importAll(pending.file)
      setPending(null)
      setMsg({ error: false, text: 'Yedek geri yüklendi.' })
    } catch (err) {
      setMsg({ error: true, text: `Geri yükleme başarısız, veri değişmedi: ${err instanceof Error ? err.message : err}` })
    }
  }

  return (
    <Page title="Ayarlar">
      <div class="stack">
        <Card title="Gün düzeni">
          <label class="row">
            <span class="grow">Kalkış saati</span>
            <input type="time" value={s?.wakeTime ?? DEFAULT_SETTINGS.wakeTime} onChange={e => setSetting('wakeTime', (e.target as HTMLInputElement).value)} />
          </label>
          <label class="row">
            <span class="grow">Yatış saati</span>
            <input type="time" value={s?.sleepTime ?? DEFAULT_SETTINGS.sleepTime} onChange={e => setSetting('sleepTime', (e.target as HTMLInputElement).value)} />
          </label>
        </Card>

        <Card title="Pomodoro (dakika)">
          <PomoField label="Çalışma" k="work" />
          <PomoField label="Kısa mola" k="short" />
          <PomoField label="Uzun mola" k="long" />
          <PomoField label="Uzun mola her kaç turda" k="longEvery" />
        </Card>

        <Card title="Yedek">
          <p class="note">
            {s?.lastBackupAt ? `Son yedek: ${new Date(s.lastBackupAt).toLocaleString('tr-TR')}` : 'Henüz yedek alınmadı.'}
          </p>
          <div class="row">
            <Button onClick={() => downloadBackup()}>Yedeği indir</Button>
            <Button variant="ghost" onClick={() => fileRef.current?.click()}>Yedekten geri yükle</Button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={pick} />
          {msg && <p class="note" role="status" style={msg.error ? 'color: var(--danger, #e5484d)' : ''}>{msg.text}</p>}
          {pending && (
            <div class="stack" style="margin-top: 12px">
              <p class="note">
                <strong>Dikkat:</strong> Şu anki TÜM veri (ayarlar dahil) silinip bu dosyanın içeriğiyle değiştirilecek. Bu işlem geri alınamaz.
              </p>
              <ul class="note" style="margin: 0; padding-left: 18px">
                {Object.entries(pending.counts).filter(([, n]) => n > 0).map(([name, n]) => <li key={name}>{name}: {n} kayıt</li>)}
              </ul>
              <div class="row">
                <Button variant="danger" onClick={restore}>Mevcut verinin yerine yaz</Button>
                <Button variant="ghost" onClick={() => setPending(null)}>Vazgeç</Button>
              </div>
            </div>
          )}
        </Card>

        <Card title="Depolama">
          <p class="note">
            {persisted === undefined ? '…' : persisted ? 'Kalıcı: tarayıcı verini kendiliğinden silmez.' : 'Tarayıcı silebilir: uygulamayı ana ekrana ekle.'}
          </p>
        </Card>

        <ShortcutsGuide />
      </div>
    </Page>
  )
}
