import { useEffect, useState } from 'preact/hooks'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import {
  deleteSet, exerciseHistory, finishWorkout, gymStatus, logSet, seedGymIfEmpty, updateSet,
  useExercises, useTemplates, useWorkoutSets,
} from '../../db/repo/gym'
import { setSetting, useSettings } from '../../db/repo/settings'
import type { Exercise, Workout, WorkoutSet } from '../../db/types'
import { deloadSets, suggestNext } from '../../logic/progression'
import { navigate } from '../../router'
import { Page } from '../../ui/Page'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'
import { unlockAudio } from '../../ui/alarm'
import { useNow } from '../../ui/useNow'
import { SetRow } from './SetRow'
import { RestTimer } from './RestTimer'
import { StartPicker } from './StartPicker'
import { fmtKg, fmtSets } from './format'

const REASON = { artir: 'ağırlık artır', tekrar: '+1 tekrar', hafiflet: '%10 hafiflet' } as const

interface CardProps {
  ex: Exercise
  workout: Workout
  planned: number
  sets: WorkoutSet[]
  onLogged: () => void
}

function ExerciseCard({ ex, workout, planned, sets, onLogged }: CardProps) {
  const [hist, setHist] = useState<{ last: WorkoutSet[]; prev: WorkoutSet[] } | null>(null)
  useEffect(() => {
    let alive = true
    exerciseHistory(ex.id, workout.id).then(h => { if (alive) setHist(h) })
    return () => { alive = false }
  }, [ex.id, workout.id])

  const mine = sets.filter(s => s.exerciseId === ex.id).sort((a, b) => a.order - b.order)
  if (!hist) return <Card title={ex.name}><p class="muted">…</p></Card>
  const sug = suggestNext(ex, hist.last, hist.prev)
  const pending = Math.max(0, planned - mine.length)
  const lastDone = mine.at(-1)
  const preKg = lastDone?.weightKg ?? sug?.weightKg ?? hist.last[0]?.weightKg
  const preReps = sug && !lastDone ? sug.reps : lastDone?.reps ?? hist.last[0]?.reps

  return (
    <Card title={ex.name}>
      {hist.last.length > 0 && <div class="muted">Geçen sefer: {fmtSets(hist.last)}</div>}
      {sug && (
        <div style="margin: 6px 0">
          <span class="chip on">Öneri: {fmtKg(sug.weightKg)} kg × {sug.reps} — {REASON[sug.reason]}</span>
        </div>
      )}
      {mine.map(s => (
        <SetRow
          key={s.id} done kg={fmtKg(s.weightKg)} reps={String(s.reps)} step={ex.incrementKg}
          onChange={(kg, reps) => void updateSet(s.id, { weightKg: kg, reps })}
          onDelete={() => void deleteSet(s.id)}
        />
      ))}
      {Array.from({ length: pending }, (_, i) => (
        <SetRow
          key={`p${mine.length + i}`} done={false} step={ex.incrementKg}
          kg={preKg === undefined ? '' : fmtKg(preKg)} reps={preReps === undefined ? '' : String(preReps)}
          onCommit={async (kg, reps) => {
            unlockAudio()
            await logSet(workout.id, ex.id, kg, reps)
            onLogged()
          }}
        />
      ))}
    </Card>
  )
}

function Active({ workout, onFinished }: { workout: Workout; onFinished: (m: string) => void }) {
  const settings = useSettings()
  const exercises = useExercises() ?? []
  const templates = useTemplates() ?? []
  const sets = useWorkoutSets(workout.id) ?? []
  const [extra, setExtra] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [rest, setRest] = useState(0)

  const byId = new Map(exercises.map(e => [e.id, e]))
  const tpl = templates.find(t => t.id === workout.templateId)
  const order: { id: string; n: number }[] = (tpl?.items ?? []).map(i => ({ id: i.exerciseId, n: i.sets }))
  for (const id of [...sets.map(s => s.exerciseId), ...extra]) if (!order.some(o => o.id === id)) order.push({ id, n: 3 })
  const free = exercises.filter(e => !order.some(o => o.id === e.id))

  const finish = async () => {
    const r = await finishWorkout(workout.id)
    await setSetting('openWorkoutId', null)
    onFinished(r === 'saved' ? 'Kaydedildi' : 'Boş antrenman silindi')
  }

  return (
    <Page title={`${tpl?.name ?? 'Boş antrenman'}${workout.isDeload ? ' (hafif)' : ''}`}>
      <div class="stack">
        {order.map(o => {
          const ex = byId.get(o.id)
          return ex ? (
            <ExerciseCard
              key={o.id} ex={ex} workout={workout} sets={sets} planned={workout.isDeload ? deloadSets(o.n) : o.n}
              onLogged={() => setRest(r => r + 1)}
            />
          ) : null
        })}
        <Button variant="ghost" onClick={() => setAdding(true)}>Egzersiz ekle</Button>
        <Button onClick={finish}>Bitir</Button>
      </div>
      {rest > 0 && <RestTimer key={rest} sec={settings?.restSec ?? 90} onClose={() => setRest(0)} />}
      <Sheet open={adding} onClose={() => setAdding(false)} title="Egzersiz ekle">
        <div class="stack">
          {free.length === 0 && <p class="muted">Eklenecek egzersiz kalmadı.</p>}
          {free.map(e => (
            <button key={e.id} type="button" class="btn btn-ghost" onClick={() => { setExtra(x => [...x, e.id]); setAdding(false) }}>
              {e.name} <span class="muted">· {e.group}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </Page>
  )
}

export function WorkoutPage() {
  const { today } = useNow()
  const settings = useSettings()
  const templates = useTemplates() ?? []
  const openId = settings?.openWorkoutId ?? null
  const workout = useLiveQuery(async () => (openId ? (await db.workouts.get(openId)) ?? null : null), [openId])
  const status = useLiveQuery(() => gymStatus(today), [today])
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => { void seedGymIfEmpty() }, [])
  useEffect(() => {
    if (!msg) return
    const id = setTimeout(() => navigate('/spor'), 900)
    return () => clearTimeout(id)
  }, [msg])

  if (msg) return <Page title="Antrenman"><p class="note" role="status">{msg}</p></Page>
  if (!settings || workout === undefined) return <Page title="Antrenman"><p class="muted">…</p></Page>
  if (!workout) {
    return (
      <Page title="Antrenman seç">
        <StartPicker inline open onClose={() => {}} templates={templates} today={today} deload={!!status?.deload} />
      </Page>
    )
  }
  return <Active key={workout.id} workout={workout} onFinished={setMsg} />
}
