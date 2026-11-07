import { useState } from 'preact/hooks'
import { COURSE_COLORS, deleteCourse, updateCourse } from '../../db/repo/courses'
import type { Course } from '../../db/types'
import { navigate } from '../../router'
import { Sheet } from '../../ui/Sheet'
import { Button } from '../../ui/Button'

interface Props { course: Course; open: boolean; onClose: () => void }

export function CourseSheet({ course, open, onClose }: Props) {
  const [name, setName] = useState(course.name)
  const [color, setColor] = useState(course.color)
  const [examDate, setExamDate] = useState(course.examDate ?? '')
  const [target, setTarget] = useState(String(course.weeklyTargetMin))

  const save = async () => {
    const n = parseInt(target, 10)
    await updateCourse(course.id, {
      name: name.trim() || course.name,
      color,
      examDate: examDate || undefined,
      weeklyTargetMin: Number.isFinite(n) && n > 0 ? n : course.weeklyTargetMin,
    })
    onClose()
  }
  const remove = async () => {
    if (!confirm(`"${course.name}" silinsin mi? Konuları arşivlenir, çalışma süreleri kalır.`)) return
    await deleteCourse(course.id)
    onClose()
    navigate('/ders')
  }

  return (
    <Sheet open={open} onClose={onClose} title="Dersi düzenle">
      <label class="field"><span>Ad</span>
        <input type="text" value={name} onInput={e => setName((e.target as HTMLInputElement).value)} />
      </label>
      <div class="field">
        <span class="muted">Renk</span>
        <div class="row" style="flex-wrap: wrap">
          {COURSE_COLORS.map(c => (
            <button key={c} type="button" aria-label={c} aria-pressed={color === c} onClick={() => setColor(c)}
              style={`width: 44px; height: 44px; border-radius: 50%; background: ${c}; border: 3px solid ${color === c ? 'var(--text)' : 'transparent'}`} />
          ))}
        </div>
      </div>
      <label class="field"><span>Sınav tarihi</span>
        <input type="date" value={examDate} onChange={e => setExamDate((e.target as HTMLInputElement).value)} />
      </label>
      <label class="field"><span>Haftalık hedef (dk)</span>
        <input type="number" inputMode="numeric" min="0" step="30" value={target} onInput={e => setTarget((e.target as HTMLInputElement).value)} />
      </label>
      <div class="row">
        <Button variant="danger" onClick={remove}>Sil</Button>
        <Button class="grow" onClick={save}>Kaydet</Button>
      </div>
    </Sheet>
  )
}
