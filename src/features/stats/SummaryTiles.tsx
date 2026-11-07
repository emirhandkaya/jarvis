import type { WeekSummary } from '../../logic/stats'
import { fmtMin } from '../../logic/stats'

const num = (n: number, digits = 1) => n.toLocaleString('tr-TR', { maximumFractionDigits: digits })

export function SummaryTiles({ s, compact = false }: { s: WeekSummary; compact?: boolean }) {
  const tiles: [string, string][] = [
    ['Odak', fmtMin(s.focusMin)],
    ['Tekrar', String(s.ratedSessions)],
    ['Antrenman', `${s.workouts} · ${s.volume.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} kg`],
    ['Alışkanlık', s.habitRate === null ? '—' : `%${Math.round(s.habitRate * 100)}`],
    ['Uyku', s.avgSleepH === null ? '—' : `${num(s.avgSleepH)} sa`],
    ['Enerji', s.avgEnergy === null ? '—' : num(s.avgEnergy)],
    ['Görev', String(s.tasksDone)],
  ]
  return (
    <div style={`display: grid; grid-template-columns: repeat(${compact ? 3 : 2}, 1fr); gap: 8px`}>
      {tiles.map(([k, v]) => (
        <div key={k} style="background: var(--bg); border-radius: 10px; padding: 8px 10px">
          <div class="muted" style="font-size: .75rem">{k}</div>
          <div style="font-weight: 600">{v}</div>
        </div>
      ))}
    </div>
  )
}
