import { useEffect, useState } from 'preact/hooks'
import { db } from '../../db/schema'
import { saveMorning } from '../../db/repo/checkins'
import { useTasks } from '../../db/repo/tasks'
import { addDays, todayStr } from '../../logic/dates'
import { suggestedPriorities } from '../../logic/checkin'
import { todayView } from '../../logic/tasks'
import { navigate } from '../../router'
import { Page } from '../../ui/Page'
import { Button } from '../../ui/Button'
import { Scale } from '../../ui/Scale'
import { useNow } from '../../ui/useNow'

const SLOTS = 3
const roundHalf = (n: number) => Math.round(n * 2) / 2

export function CheckinPage() {
  const { today } = useNow()
  const tasks = useTasks()
  const [sleep, setSleep] = useState('')
  const [energy, setEnergy] = useState<number>()
  const [mood, setMood] = useState<number>()
  const [prios, setPrios] = useState<string[]>(['', '', ''])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [cur, yest, health] = await Promise.all([
        db.checkins.get(today), db.checkins.get(addDays(today, -1)), db.health.get(today),
      ])
      if (!alive) return
      if (cur?.sleepHours !== undefined) setSleep(String(cur.sleepHours))
      else if (health?.sleepMin) setSleep(String(roundHalf(health.sleepMin / 60)))
      setEnergy(cur?.energy)
      setMood(cur?.mood)
      const base = cur?.priorities?.some(p => p.trim()) ? cur.priorities : suggestedPriorities(yest)
      setPrios(Array.from({ length: SLOTS }, (_, i) => base[i] ?? ''))
      setReady(true)
    })()
    return () => { alive = false }
  }, [today])

  const view = todayView(tasks ?? [], today)
  const candidates = [...view.overdue, ...view.today].map(t => t.title)

  const setPrio = (i: number, v: string) => setPrios(p => p.map((x, j) => (j === i ? v : x)))
  const pick = (title: string) => {
    if (prios.includes(title)) return setPrios(p => p.map(x => (x === title ? '' : x)))
    const i = prios.findIndex(p => !p.trim())
    if (i >= 0) setPrio(i, title)
  }

  const canSave = ready && energy !== undefined
  const save = async () => {
    if (!canSave) return
    const n = parseFloat(sleep.replace(',', '.'))
    await saveMorning(todayStr(), {
      sleepHours: Number.isFinite(n) ? n : undefined,
      energy: energy!,
      mood,
      priorities: prios.map(p => p.trim()).filter(Boolean),
    })
    navigate('#/')
  }

  return (
    <Page title="Sabah check-in">
      <label class="field">
        <span>Uyku (saat)</span>
        <input type="number" inputMode="decimal" step="0.5" min="0" max="24" value={sleep} onInput={e => setSleep((e.target as HTMLInputElement).value)} />
      </label>
      <div class="field">
        <span class="muted">Enerji</span>
        <Scale value={energy} onChange={setEnergy} labels={['Bitkin', 'Dinç']} />
      </div>
      {energy !== undefined && energy <= 2 && <p class="note">Bugün minimum gün olabilir, sorun değil.</p>}
      <div class="field">
        <span class="muted">Ruh hali</span>
        <Scale value={mood} onChange={setMood} labels={['Kötü', 'Harika']} />
      </div>
      <div class="field">
        <span class="muted">Bugünün 3 önceliği</span>
        {candidates.length > 0 && (
          <div class="row" style="flex-wrap: wrap; margin: 6px 0">
            {candidates.map(c => (
              <button key={c} type="button" class={`chip${prios.includes(c) ? ' on' : ''}`} onClick={() => pick(c)}>{c}</button>
            ))}
          </div>
        )}
        {prios.map((p, i) => (
          <input key={i} style="margin-top: 8px" type="text" placeholder={`${i + 1}. öncelik`} value={p} onInput={e => setPrio(i, (e.target as HTMLInputElement).value)} />
        ))}
      </div>
      <Button onClick={save} disabled={!canSave}>Kaydet</Button>
    </Page>
  )
}
