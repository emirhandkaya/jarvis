import { useState } from 'preact/hooks'
import { useSettings } from '../../db/repo/settings'
import { Page } from '../../ui/Page'
import { FocusSetup } from './FocusSetup'
import { FocusRunning } from './FocusRunning'
import { FocusFinish } from './FocusFinish'

export function FocusPage() {
  const settings = useSettings()
  const [finishing, setFinishing] = useState(false)
  if (!settings) return <Page title="Odak" />
  const timer = settings.activeTimer
  return (
    <Page title="Odak">
      {finishing
        ? <FocusFinish timer={timer} onBack={() => setFinishing(false)} />
        : timer
          ? <FocusRunning timer={timer} cfg={settings.pomodoro} onFinish={() => setFinishing(true)} />
          : <FocusSetup lastCourseId={settings.lastFocusCourseId} />}
    </Page>
  )
}
