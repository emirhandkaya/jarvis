import type { HabitLog } from '../../db/types'
import { addDays, weekStart } from '../../logic/dates'
import { heatmap } from '../../logic/habits'

const WEEKS = 12

// 7 satır (Pzt..Paz) × 12 sütun (hafta). Son sütun bu hafta.
export function Heatmap({ logs, today }: { logs: HabitLog[]; today: string }) {
  const status = new Map(heatmap(logs, today).map(c => [c.date, c.status]))
  const first = addDays(weekStart(today), -7 * (WEEKS - 1))
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const date = addDays(first, Math.floor(i / 7) * 7 + (i % 7))
    return { date, st: status.get(date) }
  })
  return (
    <div
      role="img" aria-label="Son 12 hafta"
      style="display: grid; grid-template-rows: repeat(7, 1fr); grid-auto-flow: column; gap: 3px; margin-top: 8px"
    >
      {cells.map(({ date, st }) => {
        const future = date > today
        const bg = st === 'done' ? 'var(--accent)' : st === 'min' ? 'color-mix(in srgb, var(--accent) 45%, transparent)' : 'var(--bg)'
        const border = st === 'joker' ? '1px solid var(--accent)' : '1px solid transparent'
        return (
          <i
            key={date} title={date}
            style={`aspect-ratio: 1; border-radius: 3px; background: ${bg}; border: ${border}; ${future ? 'visibility: hidden' : ''}`}
          />
        )
      })}
    </div>
  )
}
