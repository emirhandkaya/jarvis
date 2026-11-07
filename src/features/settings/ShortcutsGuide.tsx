import { Card } from '../../ui/Card'

const BASE = 'https://jarvis.emirhandurmuskaya.com'
const LINKS: [string, string][] = [
  ['Odak', `${BASE}/#/odak`],
  ['Antrenman kaydı', `${BASE}/#/spor/yeni`],
  ['Sabah check-in', `${BASE}/#/checkin`],
  ['Bugün', `${BASE}/#/`],
]

export function ShortcutsGuide() {
  return (
    <Card title="iPhone Kısayolları">
      <ol class="note" style="padding-left: 18px; margin: 0 0 12px">
        <li>iPhone'da Kısayollar uygulamasını aç, sağ üstteki + ile yeni kısayol oluştur.</li>
        <li>"Eylem Ekle" → "URL'yi Aç" (Open URLs) eylemini seç.</li>
        <li>Aşağıdaki adreslerden birini kopyalayıp URL alanına yapıştır.</li>
        <li>Kısayola isim ver, ardından Paylaş → "Ana Ekrana Ekle" ile widget gibi kullan.</li>
      </ol>
      <div class="stack">
        {LINKS.map(([label, url]) => (
          <div key={url}>
            <div class="muted">{label}</div>
            <input type="text" readOnly value={url} onFocus={e => (e.target as HTMLInputElement).select()} />
          </div>
        ))}
      </div>
    </Card>
  )
}
