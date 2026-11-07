import { useState } from 'preact/hooks'
import { addGoal, archiveGoal, useGoals } from '../../db/repo/goals'
import { addDays, diffDays, todayStr, weekStart } from '../../logic/dates'
import type { Goal } from '../../db/types'
import { Page } from '../../ui/Page'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'

const CHILD_KIND: Partial<Record<Goal['kind'], Goal['kind']>> = { identity: 'cycle', cycle: 'week' }

function create(kind: Goal['kind'], title: string, parentId?: string) {
  if (!title.trim()) return Promise.resolve(null)
  if (kind === 'week') {
    const ws = weekStart(todayStr())
    return addGoal('week', title, parentId, ws, addDays(ws, 6))
  }
  return addGoal(kind, title, parentId)
}

function AddInline({ kind, parentId, placeholder }: { kind: Goal['kind']; parentId?: string; placeholder: string }) {
  const [text, setText] = useState('')
  const submit = async (e: Event) => {
    e.preventDefault()
    if (await create(kind, text, parentId)) setText('')
  }
  return (
    <form class="row" style="margin-top: 8px" onSubmit={submit}>
      <input class="grow" type="text" placeholder={placeholder} value={text} onInput={e => setText((e.target as HTMLInputElement).value)} />
      <button type="submit" class="btn btn-primary" aria-label="Ekle">+</button>
    </form>
  )
}

function GoalItem({ goal, goals }: { goal: Goal; goals: Goal[] }) {
  const [adding, setAdding] = useState(false)
  const childKind = CHILD_KIND[goal.kind]
  const parent = goal.parentId ? goals.find(g => g.id === goal.parentId) : undefined
  const weeksLeft = goal.kind === 'cycle' && goal.end ? Math.max(0, Math.ceil(diffDays(todayStr(), goal.end) / 7)) : undefined

  return (
    <div style="padding: 8px 0; border-top: 1px solid #2a2e38">
      <div class="row">
        <div class="grow">
          <div>{goal.title}</div>
          <div class="task-meta">
            {parent ? `↳ ${parent.title}` : ''}
            {weeksLeft !== undefined ? `${parent ? ' · ' : ''}${weeksLeft} hafta kaldı` : ''}
          </div>
        </div>
        {childKind && <Button variant="ghost" onClick={() => setAdding(a => !a)} aria-label="Alt hedef ekle">+ Alt</Button>}
        <Button variant="ghost" onClick={() => archiveGoal(goal.id)} aria-label="Arşivle">Arşivle</Button>
      </div>
      {adding && childKind && <AddInline kind={childKind} parentId={goal.id} placeholder={childKind === 'cycle' ? '12 haftalık hedef…' : 'Bu haftanın hedefi…'} />}
    </div>
  )
}

export function GoalsPage() {
  const all = useGoals() ?? []
  const goals = all.filter(g => g.status === 'active')
  const ws = weekStart(todayStr())
  const sections: { kind: Goal['kind']; title: string; placeholder: string; list: Goal[] }[] = [
    { kind: 'identity', title: 'Kim olmak istiyorum?', placeholder: 'Örn. Disiplinli biri…', list: goals.filter(g => g.kind === 'identity') },
    { kind: 'cycle', title: '12 haftalık hedefler', placeholder: '12 haftalık hedef…', list: goals.filter(g => g.kind === 'cycle') },
    { kind: 'week', title: 'Bu haftanın hedefleri', placeholder: 'Bu haftanın hedefi…', list: goals.filter(g => g.kind === 'week' && (g.start ?? '') >= ws) },
  ]

  return (
    <Page title="Hedefler">
      {sections.map(s => (
        <Card key={s.kind} title={s.title}>
          {s.list.map(g => <GoalItem key={g.id} goal={g} goals={all} />)}
          {s.list.length === 0 && <p class="muted" style="margin: 0">Henüz yok.</p>}
          <AddInline kind={s.kind} placeholder={s.placeholder} />
        </Card>
      ))}
    </Page>
  )
}
