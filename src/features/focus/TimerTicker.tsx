import { useEffect, useRef } from 'preact/hooks'
import { useSettings } from '../../db/repo/settings'
import { saveTimer } from '../../db/repo/focus'
import { advance, type ActiveTimer } from '../../logic/timer'
import { setTimerRunning } from '../../ui/UpdateBanner'
import { beep, requestWakeLock, vibrate } from '../../ui/alarm'

// Uygulama düzeyinde: Odak ekranı kapalıyken de zamanlayıcı ilerler.
export function TimerTicker() {
  const settings = useSettings()
  const db = settings?.activeTimer ?? null
  const cfg = settings?.pomodoro
  const mem = useRef<ActiveTimer | null>(null)
  const seen = useRef('')
  const cfgRef = useRef(cfg)
  cfgRef.current = cfg

  // Bellekteki kopya DB değerini yalnızca DB'deki phaseStartedAt / paused / startedAt değişince alır.
  const dbKey = db ? `${db.startedAt}|${db.phaseStartedAt}|${db.paused}` : ''
  if (dbKey !== seen.current) {
    seen.current = dbKey
    mem.current = db
  }

  const active = !!db
  const paused = !!db?.paused

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      const t = mem.current
      const c = cfgRef.current
      if (!t || !c) return
      const { timer: next, finishedPhases } = advance(t, new Date(), c)
      if (finishedPhases.length) {
        mem.current = next
        void saveTimer(next)
        beep()
        vibrate()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [active])

  useEffect(() => {
    const running = active && !paused
    setTimerRunning(running)
    if (!running) return
    let release: (() => void) | null = null
    let dead = false
    const acquire = async () => {
      release?.()
      release = null
      const r = await requestWakeLock()
      if (dead) r(); else release = r
    }
    const onVisible = () => { if (document.visibilityState === 'visible') void acquire() }
    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      dead = true
      document.removeEventListener('visibilitychange', onVisible)
      release?.()
      setTimerRunning(false)
    }
  }, [active, paused])

  return null
}
