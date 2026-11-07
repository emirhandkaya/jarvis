import { useRef, useState } from 'preact/hooks'
import { setHabitStatus } from '../../db/repo/habits'
import type { Habit, HabitLog } from '../../db/types'
import { Sheet } from '../../ui/Sheet'

export interface HabitItem {
  habit: Habit
  status?: HabitLog['status']
  missedYesterday: boolean
  weekDone?: number
}

export function HabitCheck({ item, today }: { item: HabitItem; today: string }) {
  const { habit, status, missedYesterday, weekDone } = item
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const longPressed = useRef(false)

  const apply = async (s: HabitLog['status'] | null) => {
    const r = await setHabitStatus(habit.id, today, s)
    if (r === 'joker-limit') { setErr('Bu hafta joker hakkını kullandın'); return }
    setErr('')
    setOpen(false)
  }
  const down = () => {
    longPressed.current = false
    timer.current = setTimeout(() => { longPressed.current = true; setOpen(true) }, 500)
  }
  const up = () => clearTimeout(timer.current)
  const tap = () => {
    if (longPressed.current) { longPressed.current = false; return }
    void apply(status === 'done' ? null : 'done')
  }

  const cls = status === 'done' ? ' done' : ''
  const mark = status === 'min' ? 'min' : status === 'joker' ? 'joker' : ''
  return (
    <div style={missedYesterday ? 'border-left: 3px solid var(--is)' : ''}>
      <div class="task-row">
        <button
          type="button" class={`task-circle${cls}`} aria-label={status === 'done' ? 'Geri al' : 'Tamamla'}
          onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} onContextMenu={e => e.preventDefault()}
          onClick={tap}
        ><i style={status === 'min' ? 'background: color-mix(in srgb, var(--accent) 45%, transparent); border-color: var(--accent)' : status === 'joker' ? 'border-style: dashed; border-color: var(--accent)' : ''} /></button>
        <div class="task-main" style="padding: 6px 0">
          <div class={status === 'done' ? 'done-t' : ''}>
            {habit.name}{mark && <span class="muted"> · {mark}</span>}
            {weekDone !== undefined && habit.schedule.type === 'perWeek' && <span class="muted"> · {weekDone}/{habit.schedule.n}</span>}
          </div>
          {habit.ifThen && <div class="task-meta">Eğer {habit.ifThen}</div>}
          {missedYesterday && habit.minVersion && <div class="task-meta" style="color: var(--is)">Dün kaçtı — bugün minimum versiyonu yeter: {habit.minVersion}</div>}
        </div>
        <button type="button" class="btn btn-ghost" style="min-width: 44px; padding: 0" aria-label="Seçenekler" onClick={() => { setErr(''); setOpen(true) }}>…</button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title={habit.name}>
        <div class="stack">
          <button type="button" class="btn btn-primary" onClick={() => apply('done')}>Yapıldı</button>
          <button type="button" class="btn btn-ghost" onClick={() => apply('min')}>Minimum yaptım{habit.minVersion ? `: ${habit.minVersion}` : ''}</button>
          <button type="button" class="btn btn-ghost" onClick={() => apply('joker')}>Joker (bugünü sayma)</button>
          <button type="button" class="btn btn-danger" onClick={() => apply(null)}>Temizle</button>
          {err && <p class="note" role="status">{err}</p>}
        </div>
      </Sheet>
    </div>
  )
}
