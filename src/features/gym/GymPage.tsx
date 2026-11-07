import { useEffect, useState } from 'preact/hooks'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { gymStatus, seedGymIfEmpty, useExercises, useTemplates, weeklyVolume } from '../../db/repo/gym'
import { setVolume } from '../../logic/progression'
import { Page } from '../../ui/Page'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Sparkline } from '../../ui/charts/Sparkline'
import { useNow } from '../../ui/useNow'
import { StartPicker } from './StartPicker'
import { TemplatesSheet } from './TemplatesSheet'
import { fmtDate } from './format'

export const DELOAD_NOTE = {
  zaman: '6 haftadır yüklendin, bu hafta hafif hafta yap',
  yorgunluk: 'Son günlerde enerjin düşük, hafif bir antrenman iyi olur',
} as const

export function GymPage() {
  const { today } = useNow()
  const [picker, setPicker] = useState(false)
  const [editor, setEditor] = useState(false)
  const templates = useTemplates() ?? []
  useExercises()
  useEffect(() => { void seedGymIfEmpty() }, [])

  const status = useLiveQuery(() => gymStatus(today), [today])
  const volume = useLiveQuery(() => weeklyVolume(8, today), [today])
  const recent = useLiveQuery(async () => {
    const [workouts, sets, tpls] = await Promise.all([db.workouts.toArray(), db.sets.toArray(), db.templates.toArray()])
    const name = new Map(tpls.map(t => [t.id, t.name]))
    return workouts
      .map(w => ({ w, sets: sets.filter(s => s.workoutId === w.id) }))
      .filter(x => x.sets.length > 0)
      .sort((a, b) => b.w.date.localeCompare(a.w.date) || b.w.createdAt.localeCompare(a.w.createdAt))
      .slice(0, 8)
      .map(({ w, sets: ss }) => ({
        id: w.id, date: w.date, deload: w.isDeload,
        title: (w.templateId && name.get(w.templateId)) || 'Boş antrenman',
        count: ss.length, volume: Math.round(setVolume(ss)),
      }))
  }, [])

  return (
    <Page title="Spor">
      <div class="stack">
        <Card>
          <strong>Bu hafta {status?.weekCount ?? 0} / {status?.target ?? 3} antrenman</strong>
          <div class="muted">{status?.lastWorkoutDate ? `Son antrenman: ${fmtDate(status.lastWorkoutDate)}` : 'Henüz antrenman yok.'}</div>
        </Card>
        {status?.deload && <p class="note">{DELOAD_NOTE[status.deload]}</p>}
        <Button class="start-btn" onClick={() => setPicker(true)}>Antrenmana başla</Button>

        <Card title="Haftalık hacim (8 hafta)">
          {volume && volume.some(v => v > 0) ? <Sparkline values={volume} width={240} height={48} /> : <p class="muted">Veri birikince burada görünür.</p>}
        </Card>

        <div class="group-title">Son antrenmanlar</div>
        {recent?.length === 0 && <p class="muted">Kayıtlı antrenman yok.</p>}
        {(recent ?? []).map(r => (
          <Card key={r.id}>
            <div class="row">
              <strong class="grow">{r.title}{r.deload ? ' (hafif)' : ''}</strong>
              <span class="muted">{fmtDate(r.date)}</span>
            </div>
            <span class="muted">{r.count} set · {r.volume.toLocaleString('tr-TR')} kg hacim</span>
          </Card>
        ))}

        <Button variant="ghost" onClick={() => setEditor(true)}>Şablonları düzenle</Button>
      </div>
      <StartPicker open={picker} onClose={() => setPicker(false)} templates={templates} today={today} deload={!!status?.deload} />
      <TemplatesSheet open={editor} onClose={() => setEditor(false)} />
    </Page>
  )
}
