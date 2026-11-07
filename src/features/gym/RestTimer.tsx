import { useEffect, useState } from 'preact/hooks'
import { beep, vibrate } from '../../ui/alarm'

interface Props { sec: number; onClose: () => void }

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

// Parent `key` ile her sette yeniden başlatır.
export function RestTimer({ sec, onClose }: Props) {
  const [end] = useState(() => Date.now() + sec * 1000)
  const [left, setLeft] = useState(sec)
  useEffect(() => {
    let closer: ReturnType<typeof setTimeout> | undefined
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setLeft(l)
      if (l === 0) {
        clearInterval(id)
        beep()
        vibrate()
        closer = setTimeout(onClose, 1500)
      }
    }, 250)
    return () => { clearInterval(id); if (closer) clearTimeout(closer) }
  }, [end])
  return (
    <div class="update-banner" role="timer" aria-live="off">
      <strong>{left === 0 ? 'Dinlenme bitti' : `Dinlenme ${mmss(left)}`}</strong>
      <button type="button" class="btn btn-ghost" onClick={onClose}>Atla</button>
    </div>
  )
}
