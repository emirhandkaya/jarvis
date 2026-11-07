import { useEffect, useState } from 'preact/hooks'
import { advance, currentTopic, isStale, remainingSec, type ActiveTimer, type Phase, type PomodoroCfg } from '../../logic/timer'
import { discardTimer, pauseTimer, resumeTimer } from '../../db/repo/focus'
import { useTopics } from '../../db/repo/topics'
import { unlockAudio } from '../../ui/alarm'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'

const LABEL: Record<Phase, string> = { work: 'Çalış', short: 'Kısa mola', long: 'Uzun mola' }
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

interface Props { timer: ActiveTimer; cfg: PomodoroCfg; onFinish: () => void }

export function FocusRunning({ timer: stored, cfg, onFinish }: Props) {
  const [staleDismissed, setStaleDismissed] = useState(false)
  const topics = useTopics(stored.courseId)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timer = advance(stored, now, cfg).timer
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
        <Button variant="ghost" class="grow" onClick={() => { if (timer.paused) { unlockAudio(); void resumeTimer(new Date()) } else void pauseTimer(new Date()) }}>
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
