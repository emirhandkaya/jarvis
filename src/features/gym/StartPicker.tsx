import { useState } from 'preact/hooks'
import { startWorkout } from '../../db/repo/gym'
import { setSetting } from '../../db/repo/settings'
import type { Template } from '../../db/types'
import { navigate } from '../../router'
import { Sheet } from '../../ui/Sheet'

interface Props {
  open: boolean
  onClose: () => void
  templates: Template[]
  today: string
  deload: boolean
  inline?: boolean
}

export async function beginWorkout(today: string, templateId: string | undefined, isDeload: boolean): Promise<void> {
  const w = await startWorkout(today, templateId, isDeload)
  await setSetting('openWorkoutId', w.id)
  navigate('/spor/yeni')
}

export function StartPicker({ open, onClose, templates, today, deload, inline }: Props) {
  const [light, setLight] = useState(false)
  const body = (
    <div class="stack">
      {deload && (
        <button type="button" class={`chip${light ? ' on' : ''}`} aria-pressed={light} onClick={() => setLight(l => !l)}>Hafif (deload)</button>
      )}
      {templates.map(t => (
        <button key={t.id} type="button" class="btn btn-primary" onClick={() => beginWorkout(today, t.id, light)}>{t.name}</button>
      ))}
      <button type="button" class="btn btn-ghost" onClick={() => beginWorkout(today, undefined, light)}>Boş antrenman</button>
    </div>
  )
  if (inline) return body
  return <Sheet open={open} onClose={onClose} title="Antrenman seç">{body}</Sheet>
}
