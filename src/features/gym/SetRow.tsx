import { useState } from 'preact/hooks'

interface Props {
  kg: string
  reps: string
  step: number
  done: boolean
  onCommit?: (kg: number, reps: number) => void // bekleyen satır: ✓
  onChange?: (kg: number, reps: number) => void // kayıtlı satır: düzenleme
  onDelete?: () => void
}

const num = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')))
const round = (n: number) => String(Number(n.toFixed(2)))
const okKg = (n: number) => Number.isFinite(n) && n >= 0
const okReps = (n: number) => Number.isFinite(n) && n > 0

function Stepper(p: { label: string; value: string; onSet: (v: string) => void; delta: number; mode: 'decimal' | 'numeric' }) {
  const bump = (d: number) => {
    const cur = num(p.value)
    p.onSet(round(Math.max(0, (Number.isFinite(cur) ? cur : 0) + d)))
  }
  return (
    <div class="row" style="gap: 4px">
      <button type="button" class="btn btn-ghost" style="min-width: 44px; padding: 0" aria-label={`${p.label} azalt`} onClick={() => bump(-p.delta)}>−</button>
      <input
        type="text" inputMode={p.mode} aria-label={p.label} style="width: 64px; text-align: center" value={p.value}
        onInput={e => p.onSet((e.target as HTMLInputElement).value)}
      />
      <button type="button" class="btn btn-ghost" style="min-width: 44px; padding: 0" aria-label={`${p.label} artır`} onClick={() => bump(p.delta)}>+</button>
      <span class="muted">{p.label}</span>
    </div>
  )
}

export function SetRow({ kg: kg0, reps: reps0, step, done, onCommit, onChange, onDelete }: Props) {
  const [kg, setKg] = useState(kg0)
  const [reps, setReps] = useState(reps0)
  const valid = okKg(num(kg)) && okReps(num(reps))

  const edit = (k: string, r: string) => {
    setKg(k)
    setReps(r)
    if (done && onChange && okKg(num(k)) && okReps(num(r))) onChange(num(k), Math.round(num(r)))
  }

  return (
    <div class="row" style={`align-items: center; margin-bottom: 8px; opacity: ${done ? 0.75 : 1}`}>
      <div class="stack grow" style="gap: 4px">
        <Stepper label="kg" value={kg} delta={step} mode="decimal" onSet={v => edit(v, reps)} />
        <Stepper label="tekrar" value={reps} delta={1} mode="numeric" onSet={v => edit(kg, v)} />
      </div>
      {done ? (
        <button type="button" class="btn btn-danger" style="min-width: 48px; min-height: 48px" aria-label="Seti sil" onClick={onDelete}>✕</button>
      ) : (
        <button
          type="button" class="btn btn-primary" style="min-width: 56px; min-height: 56px" disabled={!valid} aria-label="Seti kaydet"
          onClick={() => onCommit?.(num(kg), Math.round(num(reps)))}
        >✓</button>
      )}
    </div>
  )
}
