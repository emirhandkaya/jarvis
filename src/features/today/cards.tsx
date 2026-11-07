import type { JSX } from 'preact'
import { useCheckin } from '../../db/repo/checkins'
import { useTasks, toggleDone } from '../../db/repo/tasks'
import { todayStr } from '../../logic/dates'
import { todayView } from '../../logic/tasks'
import { Card } from '../../ui/Card'
import { TaskRow } from '../tasks/TaskRow'
import { QuickAdd } from '../tasks/QuickAdd'

export interface CardDef { id: string; title: string; Component: () => JSX.Element | null }

function Oncelikler() {
  const today = todayStr()
  const checkin = useCheckin(today)
  const tasks = useTasks()
  const prios = (checkin?.priorities ?? []).filter(p => p.trim())
  return (
    <Card title="Bugünün öncelikleri">
      {prios.length === 0 && <p class="muted">Check-in'de öncelik seçince burada görünür.</p>}
      {prios.map((p, i) => {
        const task = tasks?.find(t => t.title === p)
        const done = !!task?.doneAt
        return (
          <div class="task-row" key={i}>
            <button
              type="button" class={`task-circle${done ? ' done' : ''}`} disabled={!task}
              aria-label={done ? 'Geri al' : 'Tamamla'} onClick={() => task && toggleDone(task.id)}
            ><i /></button>
            <span class={`task-main t${done ? ' done-t' : ''}`}>{p}</span>
          </div>
        )
      })}
    </Card>
  )
}

function Gorevler() {
  const today = todayStr()
  const tasks = useTasks()
  const view = todayView(tasks ?? [], today)
  const open = [...view.overdue, ...view.today]
  return (
    <Card title="Görevler">
      <QuickAdd defaultPlannedDate={today} />
      {open.length === 0 && <p class="muted">Bugün için açık görev yok.</p>}
      {view.overdue.length > 0 && <div class="group-title">Geciken</div>}
      {view.overdue.map(t => <TaskRow key={t.id} task={t} />)}
      {view.today.length > 0 && <div class="group-title">Bugün</div>}
      {view.today.map(t => <TaskRow key={t.id} task={t} />)}
    </Card>
  )
}

function Gunluk() {
  const c = useCheckin(todayStr())
  const has = c?.energy !== undefined
  return (
    <Card title="Gün özeti">
      {!has ? <p class="muted">Henüz check-in yok.</p> : (
        <p style="margin: 0">
          Uyku: {c?.sleepHours !== undefined ? `${c.sleepHours} sa` : '—'} · Enerji: {c?.energy}/5 · Ruh hali: {c?.mood !== undefined ? `${c.mood}/5` : '—'}
        </p>
      )}
    </Card>
  )
}

// Sonraki planlar buraya kart ekler.
export const CARDS: CardDef[] = [
  { id: 'oncelikler', title: 'Öncelikler', Component: Oncelikler },
  { id: 'gorevler', title: 'Görevler', Component: Gorevler },
  { id: 'gunluk', title: 'Gün özeti', Component: Gunluk },
]
