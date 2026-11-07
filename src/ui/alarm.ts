let ctx: AudioContext | null = null

// iOS: kullanıcı dokunuşu içinde çağrılmalı (Başla / Devam).
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      ctx = new Ctx()
    }
    if (ctx.state === 'suspended') void ctx.resume()
  } catch { /* ses yok */ }
}

export function beep(): void {
  try {
    if (!ctx) return
    const c = ctx
    if (c.state === 'suspended') void c.resume()
    for (const offset of [0, 0.25, 0.5]) {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.frequency.value = 880
      gain.gain.value = 0.2
      osc.connect(gain).connect(c.destination)
      osc.start(c.currentTime + offset)
      osc.stop(c.currentTime + offset + 0.15)
    }
  } catch { /* ses yok */ }
}

export function vibrate(): void {
  try { navigator.vibrate?.([200, 100, 200]) } catch { /* yok */ }
}

export async function requestWakeLock(): Promise<() => void> {
  try {
    const lock = await navigator.wakeLock?.request('screen')
    if (!lock) return () => {}
    return () => { void lock.release().catch(() => {}) }
  } catch {
    return () => {}
  }
}
