import { useRoute, type RouteName } from './router'
import { NavBar } from './ui/NavBar'
import { Page } from './ui/Page'
import { MenuPage } from './features/menu/MenuPage'
import { ComingSoon } from './features/placeholder/ComingSoon'
import './styles/ui.css'

function Screen({ name }: { name: RouteName }) {
  switch (name) {
    case 'bugun': return <Page title="Bugün"><p class="muted">Bugün ekranı yakında.</p></Page>
    case 'checkin': return <ComingSoon name="Check-in" />
    case 'kapanis': return <ComingSoon name="Kapanış" />
    case 'gorevler': return <ComingSoon name="Görevler" />
    case 'hedefler': return <ComingSoon name="Hedefler" />
    case 'menu': return <MenuPage />
    case 'plan': return <ComingSoon name="Plan" />
    case 'odak': return <ComingSoon name="Odak" />
    case 'ders':
    case 'dersDetay': return <ComingSoon name="Ders" />
    case 'spor':
    case 'sporYeni': return <ComingSoon name="Spor" />
    case 'aliskanlik': return <ComingSoon name="Alışkanlıklar" />
    case 'istatistik': return <ComingSoon name="İstatistik" />
    case 'degerlendirme': return <ComingSoon name="Haftalık değerlendirme" />
    case 'ayarlar': return <ComingSoon name="Ayarlar" />
    case 'importHealth': return <ComingSoon name="Sağlık verisi" />
  }
}

export function App() {
  const route = useRoute()
  return (
    <>
      <Screen name={route.name} />
      <NavBar active={route.name} />
    </>
  )
}
