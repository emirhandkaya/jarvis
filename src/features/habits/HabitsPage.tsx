import { useState } from 'preact/hooks'
import { useHabitLogs, useHabits } from '../../db/repo/habits'
import type { Habit } from '../../db/types'
import { consistency, establishment, todayList } from '../../logic/habits'
import { Page } from '../../ui/Page'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { useNow } from '../../ui/useNow'
import { HabitCheck } from './HabitCheck'
import { HabitSheet } from './HabitSheet'
import { Heatmap } from './Heatmap'

function scheduleText(h: Habit): string {
  if (h.schedule.type === 'perWeek') return `Haftada ${h.schedule.n} kez`
  const L = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
  return h.schedule.days.length === 7 ? 'Her gün' : h.schedule.days.map(d => L[d - 1]).join(' ')
}

export function HabitsPage() {
  const { today } = useNow()
  const habits = useHabits()
  const logs = useHabitLogs() ?? []
  const [sheet, setSheet] = useState<{ habit?: Habit } | null>(null)
  const active = (habits ?? []).filter(h => !h.archived)
  const list = todayList(active, logs, today)

  return (
    <Page title="Alışkanlıklar" actions={<Button onClick={() => setSheet({})}>+ Alışkanlık</Button>}>
      <div class="stack">
        <div class="group-title">Bugün</div>
        {list.length === 0 && <p class="muted">{active.length ? 'Bugün için alışkanlık yok.' : 'Henüz alışkanlık yok. Yukarıdan ekle.'}</p>}
        {list.map(it => <HabitCheck key={it.habit.id} item={it} today={today} />)}

        {active.length > 0 && <div class="group-title">Tüm alışkanlıklar</div>}
        {active.map(h => {
          const mine = logs.filter(l => l.habitId === h.id)
          const c = consistency(h, mine, today)
          const est = establishment(mine)
          return (
            <Card key={h.id} onClick={() => setSheet({ habit: h })}>
              <strong>{h.name}</strong>
              <div class="muted">{scheduleText(h)}{h.ifThen ? ` · Eğer ${h.ifThen}` : ''}{h.minVersion ? ` · Sonra: ${h.minVersion}` : ''}</div>
              <div style="margin-top: 6px">Tutarlılık: {c.done}/{c.planned} (%{Math.round(c.rate * 100)})</div>
              <div style="height: 8px; border-radius: 4px; background: var(--bg); margin: 6px 0 2px; overflow: hidden">
                <div style={`height: 100%; width: ${Math.round(est.ratio * 100)}%; background: var(--accent)`} />
              </div>
              <span class="muted">{est.days} / 66 gün</span>
              <Heatmap logs={mine} today={today} />
            </Card>
          )
        })}
      </div>
      {sheet && <HabitSheet key={sheet.habit?.id ?? 'new'} open habit={sheet.habit} onClose={() => setSheet(null)} />}
    </Page>
  )
}
