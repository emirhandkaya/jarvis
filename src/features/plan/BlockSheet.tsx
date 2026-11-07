import { useState } from 'preact/hooks'
import type { Block, Course, Task } from '../../db/types'
import { addBlock, deleteBlock, updateBlock } from '../../db/repo/blocks'
import { DAY_END, DAY_START, STEP, toHHMM, toMin } from '../../logic/blocks'
import { Sheet } from '../../ui/Sheet'
import { Button } from '../../ui/Button'

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const KINDS: { id: Block['kind']; label: string }[] = [
  { id: 'ders', label: 'Ders' }, { id: 'spor', label: 'Spor' }, { id: 'is', label: 'İş' },
  { id: 'mola', label: 'Mola' }, { id: 'diger', label: 'Diğer' },
]
const slots = (from: number, to: number) => {
  const out: string[] = []
  for (let m = from; m <= to; m += STEP) out.push(toHHMM(m))
  return out
}
const START_OPTS = slots(DAY_START, DAY_END - STEP)
const END_OPTS = slots(DAY_START + STEP, DAY_END)

interface Props {
  date: string
  block?: Block
  initialStart?: string
  tasks: Task[]
  courses: Course[]
  onClose: () => void
  onNote: (msg: string) => void
}

export function BlockSheet({ date, block, initialStart, tasks, courses, onClose, onNote }: Props) {
  const startInit = block?.start ?? initialStart ?? '09:00'
  const [title, setTitle] = useState(block?.title ?? '')
  const [kind, setKind] = useState<Block['kind']>(block?.kind ?? 'is')
  const [start, setStart] = useState(startInit)
  const [end, setEnd] = useState(block?.end ?? toHHMM(Math.min(DAY_END, toMin(startInit) + 60)))
  const [days, setDays] = useState<number[]>(block?.repeatDays ?? [])
  const [refId, setRefId] = useState<string | undefined>(block?.refId)
  const [error, setError] = useState('')
  const [askDelete, setAskDelete] = useState(false)

  const toggleDay = (d: number) => setDays(x => (x.includes(d) ? x.filter(y => y !== d) : [...x, d].sort()))

  const link = (v: string) => {
    if (!v) { setRefId(undefined); return }
    const id = v.slice(2)
    setRefId(id)
    if (v.startsWith('t:')) {
      const t = tasks.find(x => x.id === id)
      if (!t) return
      setTitle(t.title)
      setKind(t.tag === 'ders' ? 'ders' : t.tag === 'spor' ? 'spor' : 'is')
    } else {
      const c = courses.find(x => x.id === id)
      if (!c) return
      setTitle(c.name)
      setKind('ders')
    }
  }
  const linkValue = !refId ? '' : tasks.some(t => t.id === refId) ? `t:${refId}` : courses.some(c => c.id === refId) ? `c:${refId}` : ''

  const save = async () => {
    if (!title.trim()) { setError('Başlık boş olamaz'); return }
    if (toMin(end) <= toMin(start)) { setError('Bitiş saati başlangıçtan sonra olmalı'); return }
    const recurring = days.length > 0
    if (block) {
      await updateBlock(block.id, {
        title: title.trim(), kind, start, end, refId,
        repeatDays: recurring ? days : undefined,
        date: recurring ? undefined : date,
      })
    } else {
      await addBlock({ title, kind, start, end, refId, ...(recurring ? { repeatDays: days } : { date }) })
    }
    onClose()
  }

  const remove = async (scope: 'series' | 'day') => {
    if (!block) return
    await deleteBlock(block.id, scope, date)
    if (block.repeatDays?.length) onNote(scope === 'day' ? 'Bugünkü blok silindi' : 'Tekrarlayan blok silindi')
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={block ? 'Bloğu düzenle' : 'Yeni blok'}>
      <label class="field"><span>Başlık</span>
        <input type="text" value={title} onInput={e => { setTitle((e.target as HTMLInputElement).value); setError('') }} />
      </label>
      <div class="row" style="flex-wrap: wrap; margin-bottom: 12px">
        {KINDS.map(k => (
          <button key={k.id} type="button" class={`chip${kind === k.id ? ' on' : ''}`} aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>{k.label}</button>
        ))}
      </div>
      <div class="row" style="margin-bottom: 14px">
        <label class="field grow" style="margin: 0"><span>Başlangıç</span>
          <select value={start} onChange={e => { setStart((e.target as HTMLSelectElement).value); setError('') }}>
            {START_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label class="field grow" style="margin: 0"><span>Bitiş</span>
          <select value={end} onChange={e => { setEnd((e.target as HTMLSelectElement).value); setError('') }}>
            {END_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      </div>
      <div class="muted" style="font-size: .85rem; margin-bottom: 4px">Tekrarla (boşsa sadece bu gün)</div>
      <div class="row" style="flex-wrap: wrap; margin-bottom: 12px">
        {DAYS.map((l, i) => (
          <button key={l} type="button" class={`chip${days.includes(i + 1) ? ' on' : ''}`} aria-pressed={days.includes(i + 1)} onClick={() => toggleDay(i + 1)}>{l}</button>
        ))}
      </div>
      {(tasks.length > 0 || courses.length > 0) && (
        <label class="field"><span>Görev / ders bağla</span>
          <select value={linkValue} onChange={e => link((e.target as HTMLSelectElement).value)}>
            <option value="">—</option>
            {tasks.map(t => <option key={t.id} value={`t:${t.id}`}>Görev: {t.title}</option>)}
            {courses.map(c => <option key={c.id} value={`c:${c.id}`}>Ders: {c.name}</option>)}
          </select>
        </label>
      )}
      {error && <p class="note" role="alert" style="color: var(--danger)">{error}</p>}
      {askDelete && block ? (
        <div class="row">
          <Button variant="danger" class="grow" onClick={() => remove('day')}>Sadece bugün</Button>
          <Button variant="danger" class="grow" onClick={() => remove('series')}>Tümü</Button>
          <Button variant="ghost" onClick={() => setAskDelete(false)}>Vazgeç</Button>
        </div>
      ) : (
        <div class="row">
          {block && <Button variant="danger" onClick={() => (block.repeatDays?.length ? setAskDelete(true) : remove('day'))}>Sil</Button>}
          <Button class="grow" onClick={save}>Kaydet</Button>
        </div>
      )}
    </Sheet>
  )
}
