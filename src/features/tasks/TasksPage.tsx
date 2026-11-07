import { useTasks } from '../../db/repo/tasks'
import { todayStr } from '../../logic/dates'
import { todayView } from '../../logic/tasks'
import type { Task } from '../../db/types'
import { Page } from '../../ui/Page'
import { QuickAdd } from './QuickAdd'
import { TaskRow } from './TaskRow'

export function TasksPage() {
  const tasks = useTasks()
  const today = todayStr()
  const view = todayView(tasks ?? [], today)
  const shown = new Set([...view.overdue, ...view.today].map(t => t.id))
  const rest = (tasks ?? []).filter(t => !t.doneAt && !shown.has(t.id))
  const byDate = (t: Task) => t.plannedDate ?? t.dueDate ?? ''
  const upcoming = rest.filter(t => byDate(t)).sort((a, b) => byDate(a).localeCompare(byDate(b)))
  const undated = rest.filter(t => !byDate(t))

  const group = (title: string, list: Task[]) =>
    list.length > 0 && (
      <section>
        <h2 class="group-title">{title} ({list.length})</h2>
        {list.map(t => <TaskRow key={t.id} task={t} />)}
      </section>
    )

  return (
    <Page title="Görevler">
      <QuickAdd />
      {tasks && tasks.every(t => t.doneAt) && <p class="muted">Açık görev yok.</p>}
      {group('Geciken', view.overdue)}
      {group('Bugün', view.today)}
      {group('Yaklaşan', upcoming)}
      {group('Tarihsiz', undated)}
      {group('Bugün tamamlanan', view.done)}
    </Page>
  )
}
