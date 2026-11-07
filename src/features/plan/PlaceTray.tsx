import type { Course, Task } from '../../db/types'

export type PlaceItem = { type: 'task'; task: Task } | { type: 'course'; course: Course }

export const itemId = (i: PlaceItem) => (i.type === 'task' ? i.task.id : i.course.id)
export const itemTitle = (i: PlaceItem) => (i.type === 'task' ? i.task.title : i.course.name)
export const itemMinutes = (i: PlaceItem) => (i.type === 'task' ? i.task.estimateMin ?? 60 : 60)
export const itemKind = (i: PlaceItem): 'ders' | 'spor' | 'is' =>
  i.type === 'course' ? 'ders' : i.task.tag === 'ders' ? 'ders' : i.task.tag === 'spor' ? 'spor' : 'is'

interface Props {
  tasks: Task[]
  courses: Course[]
  selected: PlaceItem | null
  peak: { start: string; end: string; fromData: boolean }
  suggestion: string | null
  onSelect: (i: PlaceItem | null) => void
  onSuggest: () => void
}

export function PlaceTray({ tasks, courses, selected, peak, suggestion, onSelect, onSuggest }: Props) {
  const items: PlaceItem[] = [
    ...tasks.map(task => ({ type: 'task', task }) as PlaceItem),
    ...courses.map(course => ({ type: 'course', course }) as PlaceItem),
  ]
  if (items.length === 0) return null
  const selId = selected ? itemId(selected) : null
  const wantsPeak = selected && (selected.type === 'course' || selected.task.energy === 'high')
  return (
    <div class="place-tray">
      <div class="chip-scroll">
        {items.map(i => {
          const on = itemId(i) === selId
          return (
            <button
              key={itemId(i)} type="button" class={`chip${on ? ' on' : ''}`} aria-pressed={on}
              style={i.type === 'course' ? `border-color: ${i.course.color}` : ''}
              onClick={() => onSelect(on ? null : i)}
            >{itemTitle(i)}</button>
          )
        })}
      </div>
      {selected && (
        <div class="place-hint">
          <div class="muted">Yerleştirmek için saate dokun</div>
          {wantsPeak && (
            <div class="muted">
              Verimli saatin: {Number(peak.start.slice(0, 2))}–{Number(peak.end.slice(0, 2))}{peak.fromData ? '' : ' (varsayılan)'}
            </div>
          )}
          {wantsPeak && suggestion && (
            <button type="button" class="btn btn-ghost" onClick={onSuggest}>Önerilen saat: {suggestion}</button>
          )}
        </div>
      )}
    </div>
  )
}
