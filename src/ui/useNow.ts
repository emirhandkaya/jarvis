import { useEffect, useState } from 'preact/hooks'
import { todayStr } from '../logic/dates'

export function useNow(): { now: Date; today: string } {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', tick)
    const id = setInterval(tick, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', tick)
      clearInterval(id)
    }
  }, [])
  return { now, today: todayStr(now) }
}
