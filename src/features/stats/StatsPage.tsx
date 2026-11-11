import { useState } from 'preact/hooks'
import { useStatsInput } from '../../db/repo/stats'
import { addDays, weekStart } from '../../logic/dates'
import { buildDayRecords, computeInsights } from '../../logic/insights'
import { emptyStatsInput, fmtMin, focusByHour, trend, weekSummary } from '../../logic/stats'
import { Page } from '../../ui/Page'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Bars } from '../../ui/charts/Bars'
import { Sparkline } from '../../ui/charts/Sparkline'
import { useNow } from '../../ui/useNow'
import { SummaryTiles } from './SummaryTiles'

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const part = (d: string) => ({ day: Number(d.slice(8)), month: MONTHS[Number(d.slice(5, 7)) - 1] })

export function weekLabel(ws: string): string {
  const a = part(ws)
  const b = part(addDays(ws, 6))
  return a.month === b.month ? `${a.day}–${b.day} ${b.month}` : `${a.day} ${a.month} – ${b.day} ${b.month}`
}

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => (h % 3 === 0 ? String(h) : ''))

export function StatsPage() {
  const { today } = useNow()
  const input = useStatsInput()
  const cur = weekStart(today)
  const [ws, setWs] = useState(cur)
  const data = input ?? emptyStatsInput()
  const s = weekSummary(data, ws, today)
  const tr = trend(data, cur, 8, today)
  const insights = computeInsights(buildDayRecords(data, today, 60), data.sessions, today)
  const series: [string, number[]][] = [
    ['Odak', tr.map(w => w.focusMin)],
    ['Antrenman', tr.map(w => w.workouts)],
    ['Alışkanlık', tr.filter(w => w.habitRate !== null).map(w => w.habitRate! * 100)],
  ]

  return (
    <Page title="İstatistik">
      <div class="stack">
        <div class="row">
          <Button variant="ghost" aria-label="Önceki hafta" onClick={() => setWs(addDays(ws, -7))}>‹</Button>
          <strong class="grow" style="text-align: center">{weekLabel(ws)}</strong>
          <Button variant="ghost" aria-label="Sonraki hafta" disabled={ws >= cur} onClick={() => setWs(addDays(ws, 7))}>›</Button>
        </div>

        <Card title="Haftalık özet"><SummaryTiles s={s} /></Card>

        <Card title="Dersler">
          {s.byCourse.length === 0
            ? <p class="muted" style="margin: 0">Bu hafta ders odağı yok.</p>
            : <Bars
                horizontal
                values={s.byCourse.map(c => c.min)}
                max={Math.max(...s.byCourse.map(c => Math.max(c.min, c.target)))}
                colors={s.byCourse.map(c => c.color)}
                labels={s.byCourse.map(c => `${c.name} · ${fmtMin(c.min)} / ${fmtMin(c.target)}`)}
              />}
        </Card>

        <Card title="Son 8 hafta">
          {series.map(([name, vals]) => (
            <div class="row" key={name} style="justify-content: space-between">
              <span>{name}</span>
              <Sparkline values={vals} />
            </div>
          ))}
        </Card>

        <Card title="Saate göre odak (30 gün)">
          <Bars values={focusByHour(data.sessions, today, 30)} labels={HOUR_LABELS} />
        </Card>

        <Card title="İçgörüler">
          {insights.length === 0
            ? <p class="muted" style="margin: 0">Henüz yeterli veri yok. Birkaç hafta kullandıkça burada sana özel bulgular çıkacak.</p>
            : insights.map(i => <p key={i.id} style="margin: 0 0 8px">{i.text}</p>)}
        </Card>
      </div>
    </Page>
  )
}
