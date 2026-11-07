import { useEffect, useState } from 'preact/hooks'
import { useReviewState, saveReview, useReviewWeekStarts } from '../../db/repo/reviews'
import { useStatsInput } from '../../db/repo/stats'
import { addGoal, useGoals } from '../../db/repo/goals'
import type { Review } from '../../db/types'
import { addDays } from '../../logic/dates'
import { reviewWeekFor } from '../../logic/review'
import { isBadWeek, weekSummary, type StatsInput } from '../../logic/stats'
import { navigate } from '../../router'
import { Page } from '../../ui/Page'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { useNow } from '../../ui/useNow'
import { SummaryTiles } from '../stats/SummaryTiles'
import { weekLabel } from '../stats/StatsPage'
import { RestartCard } from './RestartCard'

function Goals({ nextWs, picked, toggle }: { nextWs: string; picked: string[]; toggle: (id: string) => void }) {
  const goals = useGoals() ?? []
  const [text, setText] = useState('')
  const [parent, setParent] = useState('')
  const weekGoals = goals.filter(g => g.kind === 'week' && g.status === 'active' && g.start === nextWs)
  const cycles = goals.filter(g => g.kind === 'cycle' && g.status === 'active')
  const add = async (e: Event) => {
    e.preventDefault()
    if (!text.trim()) return
    const g = await addGoal('week', text, parent || undefined, nextWs, addDays(nextWs, 6))
    toggle(g.id)
    setText('')
  }
  return (
    <Card title="Gelecek haftanın hedefleri">
      {weekGoals.length === 0 && <p class="muted" style="margin-top: 0">Henüz hedef yok.</p>}
      {weekGoals.map(g => (
        <label class="row tap" key={g.id}>
          <input type="checkbox" style="width: auto" checked={picked.includes(g.id)} onChange={() => toggle(g.id)} />
          <span class="grow">{g.title}</span>
        </label>
      ))}
      <form onSubmit={add} style="margin-top: 8px">
        <div class="row">
          <input class="grow" type="text" placeholder="Yeni hedef" value={text} onInput={e => setText((e.target as HTMLInputElement).value)} />
          <button type="submit" class="btn btn-primary" aria-label="Ekle">+</button>
        </div>
        {cycles.length > 0 && (
          <select style="margin-top: 8px" value={parent} onChange={e => setParent((e.target as HTMLSelectElement).value)}>
            <option value="">Üst hedef yok</option>
            {cycles.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        )}
      </form>
    </Card>
  )
}

export function ReviewPage() {
  const { today } = useNow()
  const starts = useReviewWeekStarts()
  const input = useStatsInput()
  if (!starts || !input) return <Page title="Haftalık değerlendirme" />
  return <ReviewLoader today={today} starts={starts} input={input} />
}

function ReviewLoader({ today, starts, input }: { today: string; starts: string[]; input: StatsInput }) {
  const [target] = useState(() => reviewWeekFor(today, starts))
  const isView = target.mode === 'view'
  // Görüntüleme modunda geçen haftanın kaydı gösterilir; bu hafta pazar günü yazılır.
  const ws = isView ? addDays(target.weekStart, -7) : target.weekStart
  const state = useReviewState(ws)
  if (!state) return <Page title="Haftalık değerlendirme" />
  return <ReviewBody today={today} input={input} ws={ws} isView={isView} saved={state.review} />
}

function ReviewBody({ today, input, ws, isView, saved }: { today: string; input: StatsInput; ws: string; isView: boolean; saved?: Review }) {
  const [editing, setEditing] = useState(!isView)
  const [wentWell, setWentWell] = useState('')
  const [toImprove, setToImprove] = useState('')
  const [nextFocus, setNextFocus] = useState('')
  const [goalIds, setGoalIds] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded || !saved) return
    setWentWell(saved.wentWell)
    setToImprove(saved.toImprove)
    setNextFocus(saved.nextFocus)
    setGoalIds(saved.goalIds)
    setLoaded(true)
  }, [saved, loaded])

  const s = weekSummary(input, ws, today)
  const toggle = (id: string) => setGoalIds(x => (x.includes(id) ? x.filter(y => y !== id) : [...x, id]))
  const save = async () => {
    await saveReview(ws, { wentWell, toImprove, nextFocus, goalIds })
    navigate('/')
  }
  const showForm = editing || saved === undefined

  return (
    <Page title="Haftalık değerlendirme">
      <div class="stack">
        <p class="muted" style="margin: 0">{weekLabel(ws)}</p>
        {isView && <p class="note">Bu haftanın değerlendirmesi pazar günü</p>}
        <Card title="Haftanın özeti"><SummaryTiles s={s} compact /></Card>
        {isBadWeek(s) && <RestartCard />}
        {showForm ? (
          <>
            <label class="field"><span>Ne iyi gitti?</span>
              <textarea value={wentWell} onInput={e => setWentWell((e.target as HTMLTextAreaElement).value)} />
            </label>
            <label class="field"><span>Neyi iyileştireyim?</span>
              <textarea value={toImprove} onInput={e => setToImprove((e.target as HTMLTextAreaElement).value)} />
            </label>
            <label class="field"><span>Gelecek haftanın odağı</span>
              <textarea value={nextFocus} onInput={e => setNextFocus((e.target as HTMLTextAreaElement).value)} />
            </label>
            <Goals nextWs={addDays(ws, 7)} picked={goalIds} toggle={toggle} />
            <Button class="start-btn" onClick={save}>Kaydet</Button>
          </>
        ) : (
          <Card title="Kayıtlı değerlendirme">
            {([['Ne iyi gitti?', saved!.wentWell], ['Neyi iyileştireyim?', saved!.toImprove], ['Gelecek haftanın odağı', saved!.nextFocus]] as const).map(([q, a]) => (
              <div key={q} style="margin-bottom: 10px">
                <div class="muted" style="font-size: .85rem">{q}</div>
                <div style="white-space: pre-wrap">{a || '—'}</div>
              </div>
            ))}
            <Button variant="ghost" onClick={() => setEditing(true)}>Düzenle</Button>
          </Card>
        )}
      </div>
    </Page>
  )
}
