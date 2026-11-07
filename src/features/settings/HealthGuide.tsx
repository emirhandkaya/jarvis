import { useRef, useState } from 'preact/hooks'
import { upsertHealth } from '../../db/repo/health'
import { createExportAggregator, encodeHealthParam } from '../../logic/healthImport'
import { todayStr } from '../../logic/dates'
import { navigate } from '../../router'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'

async function aggregateFile(file: File, onProgress: (mb: number) => void) {
  const agg = createExportAggregator()
  let bytes = 0
  let shown = -1
  const counter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctl) {
      bytes += chunk.length
      const mb = Math.floor(bytes / 1e6)
      if (mb !== shown) { shown = mb; onProgress(mb) }
      ctl.enqueue(chunk)
    },
  })
  const reader = file.stream().pipeThrough(counter).pipeThrough(new TextDecoderStream() as unknown as TransformStream<Uint8Array, string>).getReader()
  let tail = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const parts = (tail + value).split('\n')
    tail = parts.pop() ?? ''
    for (const line of parts) agg.push(line)
  }
  if (tail) agg.push(tail)
  return agg.result()
}

export function HealthGuide() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [mb, setMb] = useState(0)
  const [msg, setMsg] = useState<{ error: boolean; text: string } | null>(null)

  const test = () => {
    const sample = [{ date: todayStr(), sleepMin: 450, steps: 6500, activeKcal: 420, restingHr: 58, hrvMs: 55 }]
    navigate(`/import-health?d=${encodeHealthParam(sample)}`)
  }

  const pick = async (e: Event) => {
    const input = e.target as HTMLInputElement
    const f = input.files?.[0]
    input.value = ''
    if (!f) return
    setBusy(true)
    setMb(0)
    setMsg(null)
    try {
      const days = await aggregateFile(f, setMb)
      if (!days.length) setMsg({ error: true, text: 'Dosyada geçerli sağlık kaydı bulunamadı.' })
      else {
        const n = await upsertHealth(days, 'export')
        setMsg({ error: false, text: `${n} gün aktarıldı` })
      }
    } catch {
      setMsg({ error: true, text: 'Dosya okunamadı.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Apple Sağlık bağlantısı">
      <p class="note">Veri yalnızca bu cihazda kalır; hiçbir yere gönderilmez.</p>
      <ol class="note" style="padding-left: 18px; margin: 0 0 12px">
        <li>Kısayollar uygulamasında yeni bir kısayol oluştur.</li>
        <li>"Sağlık Örneklerini Bul" eylemini 5 kez ekle: Uyku Analizi, Adım, Aktif Enerji, Dinlenme Nabzı, Kalp Atış Hızı Değişkenliği. Hepsini dün / geçen gece için filtrele; toplam (adım, enerji, uyku) ya da ortalama (nabız, HRV) al.</li>
        <li>"Sözlük" eylemi ekle; anahtarlar: date, sleepMin, steps, activeKcal, restingHr, hrvMs.</li>
        <li>"Base64 ile kodla" eylemini ekle.</li>
        <li>"URL'yi aç" eylemini ekle: https://jarvis.emirhandurmuskaya.com/#/import-health?d= ve sonuna kodlanmış metni ekle.</li>
        <li>Kişisel Otomasyon: her sabah seçtiğin saatte bu kısayolu çalıştır.</li>
      </ol>
      <p class="note">
        <strong>Uyarı:</strong> iOS bağlantıyı ana ekran uygulaması yerine Safari'de açabilir; bu durumda veri Safari'nin deposuna düşer.
        Bir kez dene; veri uygulamada görünmüyorsa aşağıdaki export.xml yöntemini kullan.
      </p>
      <Button variant="ghost" onClick={test}>Test bağlantısı</Button>
      <p class="muted">Test, bugüne örnek bir sağlık verisi yazar.</p>

      <div class="group-title">export.xml ile aktar</div>
      <p class="note">
        Sağlık uygulaması → profil → "Tüm Sağlık Verilerini Dışa Aktar". Çıkan zip'i Dosyalar'da aç ve export.xml dosyasını seç.
      </p>
      <Button variant="ghost" disabled={busy} onClick={() => fileRef.current?.click()}>
        {busy ? `Okunuyor… ${mb} MB` : 'export.xml seç'}
      </Button>
      <input ref={fileRef} type="file" accept=".xml,text/xml" hidden onChange={pick} />
      {msg && <p class="note" role="status" style={msg.error ? 'color: var(--danger, #e5484d)' : ''}>{msg.text}</p>}
    </Card>
  )
}
