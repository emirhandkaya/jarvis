import { Page } from '../../ui/Page'

const ITEMS: [string, string][] = [
  ['#/ders', 'Ders'],
  ['#/aliskanlik', 'Alışkanlıklar'],
  ['#/gorevler', 'Görevler'],
  ['#/hedefler', 'Hedefler'],
  ['#/istatistik', 'İstatistik'],
  ['#/degerlendirme', 'Haftalık değerlendirme'],
  ['#/ayarlar', 'Ayarlar'],
]

export function MenuPage() {
  return (
    <Page title="Menü">
      <ul class="menu-list">
        {ITEMS.map(([href, label]) => (
          <li key={href}><a class="tap menu-item" href={href}>{label}<span aria-hidden="true">›</span></a></li>
        ))}
      </ul>
    </Page>
  )
}
