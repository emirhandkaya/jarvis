export function beep(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    for (const offset of [0, 0.25, 0.5]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      gain.gain.value = 0.2
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + offset)
      osc.stop(ctx.currentTime + offset + 0.15)
    }
    setTimeout(() => { void ctx.close() }, 1200)
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
