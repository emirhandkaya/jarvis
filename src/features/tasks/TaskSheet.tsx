import { deleteTask, planFor, updateTask } from '../../db/repo/tasks'
import { useGoals } from '../../db/repo/goals'
import { goalChain } from '../../logic/tasks'
import { addDays, todayStr } from '../../logic/dates'
import type { Tag, Task } from '../../db/types'
import { Sheet } from '../../ui/Sheet'
import { Button } from '../../ui/Button'

const TAGS: [Tag, string][] = [['ders', 'Ders'], ['spor', 'Spor'], ['kisisel', 'Kişisel'], ['is', 'İş']]
const PRIOS: [1 | 2 | 3, string][] = [[1, 'Yüksek'], [2, 'Orta'], [3, 'Düşük']]

interface Props { task: Task; open: boolean; onClose: () => void }

export function TaskSheet({ task, open, onClose }: Props) {
  const goals = useGoals()
  const today = todayStr()
  const active = (goals ?? []).filter(g => g.status === 'active')

  const choice = <T extends string | number>(items: [T, string][], cur: T, set: (v: T) => void) => (
    <div class="row" style="flex-wrap: wrap">
      {items.map(([v, label]) => (
        <button key={String(v)} type="button" class={`chip${cur === v ? ' on' : ''}`} onClick={() => set(v)}>{label}</button>
      ))}
    </div>
  )

  return (
    <Sheet open={open} onClose={onClose} title={task.title}>
      <div class="field"><span class="muted">Etiket</span>{choice(TAGS, task.tag, tag => updateTask(task.id, { tag }))}</div>
      <div class="field"><span class="muted">Öncelik</span>{choice(PRIOS, task.priority, priority => updateTask(task.id, { priority }))}</div>
      <div class="field">
        <span class="muted">Ne zaman</span>
        <div class="row">
          <Button variant={task.plannedDate === today ? 'primary' : 'ghost'} onClick={() => planFor(task.id, today)}>Bugüne al</Button>
          <Button variant={task.plannedDate === addDays(today, 1) ? 'primary' : 'ghost'} onClick={() => planFor(task.id, addDays(today, 1))}>Yarına at</Button>
          {task.plannedDate && <Button variant="ghost" onClick={() => planFor(task.id, null)}>Kaldır</Button>}
        </div>
      </div>
      <label class="field">
        <span>Son tarih</span>
        <input type="date" value={task.dueDate ?? ''} onChange={e => {
          const v = (e.target as HTMLInputElement).value
          const patch: Partial<Task> = { dueDate: v || undefined }
          updateTask(task.id, patch)
        }} />
      </label>
      <label class="field">
        <span>Tahmini süre (dk)</span>
        <input type="number" inputMode="numeric" min="0" step="5" value={task.estimateMin ?? ''} onChange={e => {
          const n = parseInt((e.target as HTMLInputElement).value, 10)
          updateTask(task.id, { estimateMin: Number.isFinite(n) && n > 0 ? n : undefined })
        }} />
      </label>
      <div class="field">
        <span class="muted">Enerji</span>
        {choice<'high' | 'low'>([['high', 'Yüksek'], ['low', 'Düşük']], task.energy, energy => updateTask(task.id, { energy }))}
      </div>
      <label class="field">
        <span>Hedef</span>
        <select value={task.goalId ?? ''} onChange={e => updateTask(task.id, { goalId: (e.target as HTMLSelectElement).value || undefined })}>
          <option value="">Yok</option>
          {active.map(g => <option key={g.id} value={g.id}>{goalChain(active, g.id).map(x => x.title).join(' › ')}</option>)}
        </select>
      </label>
      <div class="row">
        <Button variant="danger" onClick={async () => { await deleteTask(task.id); onClose() }}>Sil</Button>
        <Button variant="ghost" class="grow" onClick={onClose}>Kapat</Button>
      </div>
    </Sheet>
  )
}
