import { useRoute, type RouteName } from './router'
import { NavBar } from './ui/NavBar'
import { MenuPage } from './features/menu/MenuPage'
import { ComingSoon } from './features/placeholder/ComingSoon'
import { TasksPage } from './features/tasks/TasksPage'
import { GoalsPage } from './features/goals/GoalsPage'
import { CheckinPage } from './features/checkin/CheckinPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { TodayPage } from './features/today/TodayPage'
import { KapanisPage } from './features/checkin/KapanisPage'
import { FocusPage } from './features/focus/FocusPage'
import { UpdateBanner } from './ui/UpdateBanner'
import './styles/ui.css'

function Screen({ name }: { name: RouteName }) {
  switch (name) {
    case 'bugun': return <TodayPage />
    case 'checkin': return <CheckinPage />
    case 'kapanis': return <KapanisPage />
    case 'gorevler': return <TasksPage />
    case 'hedefler': return <GoalsPage />
    case 'menu': return <MenuPage />
    case 'plan': return <ComingSoon name="Plan" />
    case 'odak': return <FocusPage />
    case 'ders':
    case 'dersDetay': return <ComingSoon name="Ders" />
    case 'spor':
    case 'sporYeni': return <ComingSoon name="Spor" />
    case 'aliskanlik': return <ComingSoon name="Alışkanlıklar" />
    case 'istatistik': return <ComingSoon name="İstatistik" />
    case 'degerlendirme': return <ComingSoon name="Haftalık değerlendirme" />
    case 'ayarlar': return <SettingsPage />
    case 'importHealth': return <ComingSoon name="Sağlık verisi" />
  }
}

export function App() {
  const route = useRoute()
  return (
    <>
      <Screen name={route.name} />
      <NavBar active={route.name} />
      <UpdateBanner />
    </>
  )
}
