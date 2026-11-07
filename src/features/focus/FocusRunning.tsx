import { useEffect, useRef, useState } from 'preact/hooks'
import { advance, currentTopic, isStale, remainingSec, type ActiveTimer, type Phase, type PomodoroCfg } from '../../logic/timer'
import { discardTimer, pauseTimer, resumeTimer, saveTimer } from '../../db/repo/focus'
import { useTopics } from '../../db/repo/topics'
import { setTimerRunning } from '../../ui/UpdateBanner'
import { beep, requestWakeLock, vibrate } from '../../ui/alarm'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'

const LABEL: Record<Phase, string> = { work: 'Çalış', short: 'Kısa mola', long: 'Uzun mola' }
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

interface Props { timer: ActiveTimer; cfg: PomodoroCfg; onFinish: () => void }

export function FocusRunning({ timer, cfg, onFinish }: Props) {
  const [now, setNow] = useState(() => new Date())
  const [staleDismissed, setStaleDismissed] = useState(false)
  const topics = useTopics(timer.courseId)
  const ref = useRef(timer)
  ref.current = timer

  useEffect(() => {
    setTimerRunning(true)
    return () => setTimerRunning(false)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date()
      setNow(n)
      const { timer: next, finishedPhases } = advance(ref.current, n, cfg)
      if (finishedPhases.length) {
        ref.current = next
        void saveTimer(next)
        beep()
        vibrate()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [cfg.work, cfg.short, cfg.long, cfg.longEvery])

  useEffect(() => {
    if (timer.paused) return
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
    }
  }, [timer.paused])

  const topicId = currentTopic(timer)
  const topicName = topics?.find(t => t.id === topicId)?.name
  const sec = remainingSec(timer, now, cfg)

  return (
    <div class="stack">
      <div class="muted" style="text-align: center">
        {timer.mode === 'serbest' ? 'Serbest' : `${LABEL[timer.phase]} · Tur ${timer.round}`}
        {timer.paused ? ' · Duraklatıldı' : ''}
      </div>
      <div class="focus-clock">{mmss(sec)}</div>
      {topicName && <div style="text-align: center">{topicName}</div>}
      <div class="row">
        <Button variant="ghost" class="grow" onClick={() => timer.paused ? resumeTimer(new Date()) : pauseTimer(new Date())}>
          {timer.paused ? 'Devam' : 'Duraklat'}
        </Button>
        <Button class="grow" onClick={onFinish}>Bitir</Button>
      </div>
      <Sheet open={isStale(timer, now) && !staleDismissed} onClose={() => setStaleDismissed(true)} title="Bitirmeyi unuttun mu?">
        <p class="muted">Bu oturum 4 saatten uzun süredir açık.</p>
        <div class="row">
          <Button class="grow" onClick={onFinish}>Şimdi bitir</Button>
          <Button variant="danger" class="grow" onClick={() => discardTimer()}>Sil</Button>
          <Button variant="ghost" class="grow" onClick={() => setStaleDismissed(true)}>Devam</Button>
        </div>
      </Sheet>
    </div>
  )
}
