import { useState } from 'preact/hooks'
import { addHabit, archiveHabit, updateHabit } from '../../db/repo/habits'
import type { Habit, HabitSchedule } from '../../db/types'
import { Sheet } from '../../ui/Sheet'
import { Button } from '../../ui/Button'

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

interface Props { open: boolean; onClose: () => void; habit?: Habit }

export function HabitSheet({ open, onClose, habit }: Props) {
  const [name, setName] = useState(habit?.name ?? '')
  const [ifThen, setIfThen] = useState(habit?.ifThen ?? '')
  const [minVersion, setMinVersion] = useState(habit?.minVersion ?? '')
  const [mode, setMode] = useState<'days' | 'perWeek'>(habit?.schedule.type ?? 'days')
  const [days, setDays] = useState<number[]>(habit?.schedule.type === 'days' ? habit.schedule.days : [1, 2, 3, 4, 5, 6, 7])
  const [n, setN] = useState(habit?.schedule.type === 'perWeek' ? habit.schedule.n : 3)

  const schedule: HabitSchedule = mode === 'days' ? { type: 'days', days } : { type: 'perWeek', n }
  const valid = name.trim() !== '' && (mode === 'perWeek' || days.length > 0)
  const toggleDay = (d: number) => setDays(x => (x.includes(d) ? x.filter(y => y !== d) : [...x, d].sort()))

  const save = async () => {
    if (!valid) return
    if (habit) await updateHabit(habit.id, { name: name.trim(), ifThen: ifThen.trim(), minVersion: minVersion.trim(), schedule })
    else await addHabit(name, { ifThen, minVersion, schedule })
    onClose()
  }
  const archive = async () => {
    if (!habit || !confirm(`"${habit.name}" arşivlensin mi? Geçmiş kayıtlar kalır.`)) return
    await archiveHabit(habit.id)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={habit ? 'Alışkanlığı düzenle' : 'Yeni alışkanlık'}>
      <label class="field"><span>Ad</span>
        <input type="text" value={name} onInput={e => setName((e.target as HTMLInputElement).value)} />
      </label>
      <label class="field"><span>Eğer… (ne zaman/nerede?)</span>
        <input type="text" placeholder="Kahvaltıdan sonra" value={ifThen} onInput={e => setIfThen((e.target as HTMLInputElement).value)} />
      </label>
      <label class="field"><span>Minimum versiyon</span>
        <input type="text" placeholder="1 sayfa oku" value={minVersion} onInput={e => setMinVersion((e.target as HTMLInputElement).value)} />
      </label>
      <div class="row" style="flex-wrap: wrap; margin: 8px 0">
        <button type="button" class={`chip${mode === 'days' ? ' on' : ''}`} onClick={() => setMode('days')}>Belirli günler</button>
        <button type="button" class={`chip${mode === 'perWeek' ? ' on' : ''}`} onClick={() => setMode('perWeek')}>Haftada N kez</button>
      </div>
      {mode === 'days' ? (
        <div class="row" style="flex-wrap: wrap; margin-bottom: 12px">
          {DAYS.map((l, i) => (
            <button key={l} type="button" class={`chip${days.includes(i + 1) ? ' on' : ''}`} aria-pressed={days.includes(i + 1)} onClick={() => toggleDay(i + 1)}>{l}</button>
          ))}
        </div>
      ) : (
        <div class="row" style="margin-bottom: 12px">
          <button type="button" class="btn btn-ghost" style="min-width: 44px" aria-label="Azalt" onClick={() => setN(v => Math.max(1, v - 1))}>−</button>
          <span>Haftada {n} kez</span>
          <button type="button" class="btn btn-ghost" style="min-width: 44px" aria-label="Artır" onClick={() => setN(v => Math.min(7, v + 1))}>+</button>
        </div>
      )}
      <div class="row">
        {habit && <Button variant="danger" onClick={archive}>Arşivle</Button>}
        <Button class="grow" disabled={!valid} onClick={save}>Kaydet</Button>
      </div>
    </Sheet>
  )
}
