import { useRoute, type Route } from './router'
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
import { StudyPage } from './features/study/StudyPage'
import { CourseDetail } from './features/study/CourseDetail'
import { GymPage } from './features/gym/GymPage'
import { WorkoutPage } from './features/gym/WorkoutPage'
import { HabitsPage } from './features/habits/HabitsPage'
import { ImportHealthPage } from './features/health/ImportHealthPage'
import { PlanPage } from './features/plan/PlanPage'
import { TimerTicker } from './features/focus/TimerTicker'
import { UpdateBanner } from './ui/UpdateBanner'
import './styles/ui.css'

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'bugun': return <TodayPage />
    case 'checkin': return <CheckinPage />
    case 'kapanis': return <KapanisPage />
    case 'gorevler': return <TasksPage />
    case 'hedefler': return <GoalsPage />
    case 'menu': return <MenuPage />
    case 'plan': return <PlanPage />
    case 'odak': return <FocusPage />
    case 'ders': return <StudyPage />
    case 'dersDetay': return <CourseDetail id={route.params.id} />
    case 'spor': return <GymPage />
    case 'sporYeni': return <WorkoutPage />
    case 'aliskanlik': return <HabitsPage />
    case 'istatistik': return <ComingSoon name="İstatistik" />
    case 'degerlendirme': return <ComingSoon name="Haftalık değerlendirme" />
    case 'ayarlar': return <SettingsPage />
    case 'importHealth': return <ImportHealthPage />
  }
}

export function App() {
  const route = useRoute()
  return (
    <>
      <Screen route={route} />
      <NavBar active={route.name} />
      <TimerTicker />
      <UpdateBanner />
    </>
  )
}
