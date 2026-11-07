import { useEffect, useState } from 'preact/hooks'
import { toggleDone } from '../../db/repo/tasks'
import { useGoals } from '../../db/repo/goals'
import type { Task } from '../../db/types'
import { TaskSheet } from './TaskSheet'

// Panel durumu satır dışında tutulur: görev gruplar arası taşınınca satır yeniden oluşur, panel kapanmasın.
let openId: string | null = null
const listeners = new Set<() => void>()
function setOpenId(id: string | null) {
  openId = id
  listeners.forEach(l => l())
}

export function TaskRow({ task }: { task: Task }) {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force(n => n + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  const open = openId === task.id
  const setOpen = (v: boolean) => setOpenId(v ? task.id : null)
  const goals = useGoals()
  const goal = task.goalId ? goals?.find(g => g.id === task.goalId) : undefined
  const done = !!task.doneAt

  return (
    <div class="task-row">
      <button type="button" class={`task-circle${done ? ' done' : ''}`} aria-label={done ? 'Geri al' : 'Tamamla'} onClick={() => toggleDone(task.id)}><i /></button>
      <button type="button" class="task-main" onClick={() => setOpen(true)}>
        <span class={`t${done ? ' done-t' : ''}`}>
          <span class="tag-dot" style={`background: var(--${task.tag})`} />{task.title}
        </span>
        {(goal || task.dueDate) && <span class="task-meta">{goal ? `◎ ${goal.title}` : ''}{goal && task.dueDate ? ' · ' : ''}{task.dueDate ? `son: ${task.dueDate}` : ''}</span>}
      </button>
      <TaskSheet task={task} open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
