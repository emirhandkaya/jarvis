import { useState } from 'preact/hooks'
import { useCourses } from '../../db/repo/courses'
import { useTopics } from '../../db/repo/topics'
import { useTasks } from '../../db/repo/tasks'
import { setSetting } from '../../db/repo/settings'
import { startTimer } from '../../db/repo/focus'
import type { ActiveTimer } from '../../logic/timer'
import { unlockAudio } from '../../ui/alarm'
import { Button } from '../../ui/Button'

const MODES: [ActiveTimer['mode'], string][] = [['pomodoro', 'Pomodoro'], ['serbest', 'Serbest'], ['karisik', 'Karışık']]

export function FocusSetup({ lastCourseId }: { lastCourseId: string | null }) {
  const courses = useCourses()
  const tasks = useTasks()
  const [mode, setMode] = useState<ActiveTimer['mode']>('pomodoro')
  const [picked, setPicked] = useState<string | null | undefined>(undefined)
  const [topicIds, setTopicIds] = useState<string[]>([])
  const [taskId, setTaskId] = useState('')

  const courseId = picked !== undefined ? picked : (courses ?? []).some(c => c.id === lastCourseId) ? lastCourseId : null
  const allTopics = useTopics(courseId ?? undefined) ?? []
  const topics = courseId ? allTopics.filter(t => !t.archived) : []
  const openTasks = (tasks ?? []).filter(t => !t.doneAt)

  const pickCourse = (id: string | null) => { setPicked(id); setTopicIds([]) }
  const toggleTopic = (id: string) => {
    if (mode === 'karisik') setTopicIds(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id])
    else setTopicIds(cur => cur[0] === id ? [] : [id])
  }
  const start = async () => {
    unlockAudio()
    if (courseId) await setSetting('lastFocusCourseId', courseId)
    await startTimer({
      mode, topicIds,
      ...(courseId ? { courseId } : {}),
      ...(taskId ? { taskId } : {}),
    })
  }

  return (
    <div class="stack">
      <div class="row" style="flex-wrap: wrap">
        {MODES.map(([m, label]) => (
          <button key={m} type="button" class={`chip${mode === m ? ' on' : ''}`}
            onClick={() => { setMode(m); if (m !== 'karisik') setTopicIds(cur => cur.slice(0, 1)) }}>{label}</button>
        ))}
      </div>
      <label class="field">
        <span>Ders</span>
        <select value={courseId ?? ''} onChange={e => pickCourse((e.target as HTMLSelectElement).value || null)}>
          <option value="">Dersiz</option>
          {(courses ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      {topics.length > 0 && (
        <div>
          <div class="muted">{mode === 'karisik' ? 'Konular (birden fazla)' : 'Konu'}</div>
          <div class="row" style="flex-wrap: wrap">
            {topics.map(t => (
              <button key={t.id} type="button" class={`chip${topicIds.includes(t.id) ? ' on' : ''}`} onClick={() => toggleTopic(t.id)}>{t.name}</button>
            ))}
          </div>
        </div>
      )}
      {openTasks.length > 0 && (
        <label class="field">
          <span>Görev (isteğe bağlı)</span>
          <select value={taskId} onChange={e => setTaskId((e.target as HTMLSelectElement).value)}>
            <option value="">Yok</option>
            {openTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </label>
      )}
      <Button class="start-btn" onClick={start}>Başla</Button>
    </div>
  )
}
