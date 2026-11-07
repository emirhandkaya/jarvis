import type { RouteName } from '../router'

const TABS: { href: string; label: string; icon: string; names: RouteName[]; center?: boolean }[] = [
  { href: '#/', label: 'Bugün', icon: '☀', names: ['bugun', 'checkin', 'kapanis'] },
  { href: '#/plan', label: 'Plan', icon: '▦', names: ['plan'] },
  { href: '#/odak', label: 'Odak', icon: '◎', names: ['odak'], center: true },
  { href: '#/spor', label: 'Spor', icon: '❖', names: ['spor', 'sporYeni'] },
  { href: '#/menu', label: 'Menü', icon: '☰', names: ['menu', 'ders', 'dersDetay', 'aliskanlik', 'gorevler', 'hedefler', 'istatistik', 'degerlendirme', 'ayarlar', 'importHealth'] },
]

export function NavBar({ active }: { active: RouteName }) {
  return (
    <nav class="navbar" aria-label="Ana gezinme">
      {TABS.map(t => {
        const on = t.names.includes(active)
        return (
          <a key={t.href} href={t.href} class={`tap nav-item${on ? ' active' : ''}${t.center ? ' center' : ''}`} aria-current={on ? 'page' : undefined}>
            <span class="nav-icon" aria-hidden="true">{t.icon}</span>
            <span class="nav-label">{t.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
