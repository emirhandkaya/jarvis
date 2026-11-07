import { useState } from 'preact/hooks'
import { addCourse, useCourses } from '../../db/repo/courses'
import { useDueTopics } from '../../db/repo/topics'
import { useFocusSessions } from '../../db/repo/focus'
import { examCountdown, weekMinutes } from '../../logic/study'
import { weekStart } from '../../logic/dates'
import { navigate } from '../../router'
import { Page } from '../../ui/Page'
import { Card } from '../../ui/Card'
import { useNow } from '../../ui/useNow'
import { ReviewChips } from './ReviewChips'

export function StudyPage() {
  const { today } = useNow()
  const courses = useCourses()
  const sessions = useFocusSessions() ?? []
  const due = useDueTopics(today) ?? []
  const [name, setName] = useState('')
  const [showDue, setShowDue] = useState(false)
  const ws = weekStart(today)

  const submit = async (e: Event) => {
    e.preventDefault()
    if (await addCourse(name)) setName('')
  }

  return (
    <Page title="Ders">
      <div class="stack">
        <form class="row" onSubmit={submit}>
          <input class="grow" type="text" enterkeyhint="done" placeholder="+ Ders" value={name} onInput={e => setName((e.target as HTMLInputElement).value)} />
          <button type="submit" class="btn btn-primary" aria-label="Ders ekle">+</button>
        </form>
        <Card onClick={due.length ? () => setShowDue(s => !s) : undefined}>
          <strong>Bugün tekrar: {due.length} konu</strong>
        </Card>
        {showDue && due.map(({ topic, course }) => (
          <Card key={topic.id}>
            <div class="row"><span class="tag-dot" style={`background: ${course.color}`} /><span class="grow">{topic.name}</span><span class="muted">{course.name}</span></div>
            <ReviewChips topicId={topic.id} today={today} />
          </Card>
        ))}
        {courses?.length === 0 && <p class="muted">Henüz ders yok. Yukarıdan ekle.</p>}
        {(courses ?? []).map(c => {
          const mins = weekMinutes(sessions, ws, c.id)
          const left = examCountdown(c.examDate, today)
          const pct = Math.min(100, Math.round((mins / c.weeklyTargetMin) * 100))
          return (
            <Card key={c.id} onClick={() => navigate(`/ders/${c.id}`)}>
              <div class="row">
                <span class="tag-dot" style={`background: ${c.color}`} />
                <strong class="grow">{c.name}</strong>
                {left !== null && <span class="muted">{left === 0 ? 'Sınav bugün' : `Sınava ${left} gün`}</span>}
              </div>
              <div style="height: 8px; border-radius: 4px; background: var(--bg); margin: 8px 0 4px; overflow: hidden">
                <div style={`height: 100%; width: ${pct}%; background: ${c.color}`} />
              </div>
              <span class="muted">{mins} / {c.weeklyTargetMin} dk</span>
            </Card>
          )
        })}
      </div>
    </Page>
  )
}
