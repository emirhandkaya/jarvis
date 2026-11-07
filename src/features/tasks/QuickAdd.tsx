import { useRef, useState } from 'preact/hooks'
import { addTask } from '../../db/repo/tasks'

export function QuickAdd({ defaultPlannedDate }: { defaultPlannedDate?: string }) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  const submit = async (e?: Event) => {
    e?.preventDefault()
    const t = await addTask(text, defaultPlannedDate ? { plannedDate: defaultPlannedDate } : {})
    if (t) setText('')
    ref.current?.focus()
  }

  return (
    <form class="row" style="margin-bottom: 12px" onSubmit={submit}>
      <input ref={ref} class="grow" type="text" enterkeyhint="done" placeholder="Yeni görev…" value={text} onInput={e => setText((e.target as HTMLInputElement).value)} />
      <button type="submit" class="btn btn-primary" aria-label="Görev ekle">+</button>
    </form>
  )
}
