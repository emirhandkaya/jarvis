import { useEffect, useState } from 'preact/hooks'
import { registerSW } from 'virtual:pwa-register'

let needRefresh = false
let timerRunning = false
let doUpdate: (() => void) | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

export function setTimerRunning(running: boolean): void {
  timerRunning = running
  emit()
}

export function registerUpdates(): void {
  const update = registerSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update()
      })
    },
    onNeedRefresh() {
      needRefresh = true
      emit()
    },
  })
  doUpdate = () => { void update(true) }
}

export function UpdateBanner() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force(n => n + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  if (!needRefresh || timerRunning) return null
  return (
    <div class="update-banner" role="status">
      <span>Yeni sürüm hazır</span>
      <button type="button" class="btn btn-primary" onClick={() => doUpdate?.()}>Güncelle</button>
    </div>
  )
}
