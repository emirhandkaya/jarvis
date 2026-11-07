import { useState } from 'preact/hooks'
import { addExercise, updateTemplate, useExercises, useTemplates } from '../../db/repo/gym'
import type { Template } from '../../db/types'
import { Sheet } from '../../ui/Sheet'
import { Button } from '../../ui/Button'

interface Props { open: boolean; onClose: () => void }

function NewExercise({ onAdded }: { onAdded: (id: string) => void }) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [repMin, setRepMin] = useState('8')
  const [repMax, setRepMax] = useState('12')
  const [inc, setInc] = useState('2.5')
  const submit = async (e: Event) => {
    e.preventDefault()
    const lo = parseInt(repMin, 10)
    const hi = parseInt(repMax, 10)
    const step = Number(inc.replace(',', '.'))
    if (!name.trim() || !(lo > 0) || !(hi >= lo) || !(step > 0)) return
    const ex = await addExercise({ name: name.trim(), group: group.trim() || 'Diğer', repMin: lo, repMax: hi, incrementKg: step })
    setName('')
    setGroup('')
    onAdded(ex.id)
  }
  const f = (set: (v: string) => void) => (e: Event) => set((e.target as HTMLInputElement).value)
  return (
    <form class="stack" onSubmit={submit}>
      <input type="text" placeholder="Yeni egzersiz adı" value={name} onInput={f(setName)} />
      <input type="text" placeholder="Grup (Göğüs, Sırt…)" value={group} onInput={f(setGroup)} />
      <div class="row">
        <label class="grow">Tekrar min<input type="number" inputMode="numeric" value={repMin} onInput={f(setRepMin)} /></label>
        <label class="grow">max<input type="number" inputMode="numeric" value={repMax} onInput={f(setRepMax)} /></label>
        <label class="grow">Artış kg<input type="text" inputMode="decimal" value={inc} onInput={f(setInc)} /></label>
      </div>
      <Button type="submit" variant="ghost">Egzersiz oluştur ve ekle</Button>
    </form>
  )
}

function TemplateEditor({ t }: { t: Template }) {
  const exercises = useExercises() ?? []
  const byId = new Map(exercises.map(e => [e.id, e]))
  const [name, setName] = useState(t.name)
  const setItems = (items: Template['items']) => updateTemplate(t.id, { items })
  const addEx = (id: string) => { if (id && !t.items.some(i => i.exerciseId === id)) void setItems([...t.items, { exerciseId: id, sets: 3 }]) }
  const free = exercises.filter(e => !t.items.some(i => i.exerciseId === e.id))
  return (
    <div class="card">
      <input
        type="text" aria-label="Şablon adı" value={name}
        onInput={e => setName((e.target as HTMLInputElement).value)}
        onBlur={() => { if (name.trim() && name.trim() !== t.name) void updateTemplate(t.id, { name: name.trim() }) }}
      />
      {t.items.map((it, i) => (
        <div class="row" key={it.exerciseId} style="margin-top: 6px">
          <span class="grow">{byId.get(it.exerciseId)?.name ?? '?'}</span>
          <button type="button" class="btn btn-ghost" style="min-width: 44px" aria-label="Set azalt"
            onClick={() => setItems(t.items.map((x, j) => (j === i ? { ...x, sets: Math.max(1, x.sets - 1) } : x)))}>−</button>
          <span>{it.sets} set</span>
          <button type="button" class="btn btn-ghost" style="min-width: 44px" aria-label="Set artır"
            onClick={() => setItems(t.items.map((x, j) => (j === i ? { ...x, sets: Math.min(10, x.sets + 1) } : x)))}>+</button>
          <button type="button" class="btn btn-danger" style="min-width: 44px" aria-label="Çıkar"
            onClick={() => setItems(t.items.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      {free.length > 0 && (
        <select style="margin-top: 8px" value="" onChange={e => addEx((e.target as HTMLSelectElement).value)}>
          <option value="">+ Egzersiz ekle…</option>
          {free.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      )}
      <details style="margin-top: 8px">
        <summary>Yeni egzersiz tanımla</summary>
        <NewExercise onAdded={addEx} />
      </details>
    </div>
  )
}

export function TemplatesSheet({ open, onClose }: Props) {
  const templates = useTemplates() ?? []
  return (
    <Sheet open={open} onClose={onClose} title="Şablonları düzenle">
      <div class="stack">
        {templates.map(t => <TemplateEditor key={t.id} t={t} />)}
        <Button variant="ghost" onClick={onClose}>Kapat</Button>
      </div>
    </Sheet>
  )
}
