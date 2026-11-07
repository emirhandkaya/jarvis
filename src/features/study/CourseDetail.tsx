import { useState } from 'preact/hooks'
import { useCourses } from '../../db/repo/courses'
import { addTopic, archiveTopic, useTopics } from '../../db/repo/topics'
import { useFocusSessions } from '../../db/repo/focus'
import { addMockExam, deleteMockExam, useMockExams } from '../../db/repo/mockExams'
import { setSetting } from '../../db/repo/settings'
import { weekMinutes } from '../../logic/study'
import { addDays, diffDays, weekStart } from '../../logic/dates'
import { navigate } from '../../router'
import { Page } from '../../ui/Page'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Sparkline } from '../../ui/charts/Sparkline'
import { useNow } from '../../ui/useNow'
import { CourseSheet } from './CourseSheet'
import { ReviewChips } from './ReviewChips'

function nextText(next: string | undefined, today: string): string {
  if (!next) return '—'
  const n = diffDays(today, next)
  return n <= 0 ? 'bugün' : `${n} gün sonra`
}

export function CourseDetail({ id }: { id: string }) {
  const { today } = useNow()
  const courses = useCourses()
  const course = courses?.find(c => c.id === id)
  const topics = (useTopics(id) ?? []).filter(t => !t.archived)
  const sessions = (useFocusSessions() ?? []).filter(s => s.courseId === id)
  const exams = useMockExams(id) ?? []
  const [editing, setEditing] = useState(false)
  const [topicName, setTopicName] = useState('')
  const [examDate, setExamDate] = useState(today)
  const [score, setScore] = useState('')
  const [notes, setNotes] = useState('')

  if (!courses) return <Page title="Ders" />
  if (!course) return <Page title="Ders"><p class="muted">Ders bulunamadı.</p><Button variant="ghost" onClick={() => navigate('/ders')}>Derslere dön</Button></Page>

  const ws = weekStart(today)
  const weeks = Array.from({ length: 8 }, (_, i) => weekMinutes(sessions, addDays(ws, -7 * (7 - i)), id))

  const submitTopic = async (e: Event) => {
    e.preventDefault()
    if (await addTopic(id, topicName)) setTopicName('')
  }
  const submitExam = async (e: Event) => {
    e.preventDefault()
    const n = parseFloat(score)
    if (!Number.isFinite(n) || !examDate) return
    await addMockExam(id, examDate, n, notes.trim() || undefined)
    setScore(''); setNotes('')
  }
  const focus = async () => {
    await setSetting('lastFocusCourseId', id)
    navigate('/odak')
  }

  return (
    <Page title={course.name} actions={<Button variant="ghost" onClick={() => setEditing(true)}>Düzenle</Button>}>
      <div class="stack">
        <Button onClick={focus}>Bu derse odaklan</Button>

        <Card title="Konular">
          <form class="row" style="margin-bottom: 12px" onSubmit={submitTopic}>
            <input class="grow" type="text" enterkeyhint="done" placeholder="Yeni konu…" value={topicName} onInput={e => setTopicName((e.target as HTMLInputElement).value)} />
            <button type="submit" class="btn btn-primary" aria-label="Konu ekle">+</button>
          </form>
          {topics.length === 0 && <p class="muted">Henüz konu yok.</p>}
          {topics.map(t => {
            const due = !t.nextReviewDate || t.nextReviewDate <= today
            return (
              <div key={t.id} style="margin-bottom: 12px">
                <div class="row">
                  <span class="grow">{t.name}</span>
                  <span aria-label={`Aşama ${t.stage}`} style="letter-spacing: 2px">
                    {Array.from({ length: 6 }, (_, i) => (i <= t.stage ? '●' : '○')).join('')}
                  </span>
                  <button type="button" class="chip" aria-label="Arşivle" onClick={() => archiveTopic(t.id)}>×</button>
                </div>
                <div class="muted">Tekrar: {nextText(t.nextReviewDate, today)}</div>
                {due && <ReviewChips topicId={t.id} today={today} />}
              </div>
            )
          })}
        </Card>

        <Card title="Bu hafta">
          <div class="row">
            <strong class="grow">{weeks[7]} dk</strong>
            <Sparkline values={weeks} />
          </div>
        </Card>

        <Card title="Denemeler">
          <form class="stack" onSubmit={submitExam}>
            <div class="row">
              <input class="grow" type="date" value={examDate} onChange={e => setExamDate((e.target as HTMLInputElement).value)} />
              <input style="width: 90px" type="number" inputMode="decimal" placeholder="Puan" value={score} onInput={e => setScore((e.target as HTMLInputElement).value)} />
            </div>
            <div class="row">
              <input class="grow" type="text" placeholder="Not" value={notes} onInput={e => setNotes((e.target as HTMLInputElement).value)} />
              <button type="submit" class="btn btn-primary" aria-label="Deneme ekle">+</button>
            </div>
          </form>
          <div style="margin: 8px 0"><Sparkline values={exams.map(e => e.score)} width={200} /></div>
          {[...exams].reverse().map(e => (
            <div key={e.id} class="row" style="min-height: 44px">
              <span class="muted">{e.date}</span>
              <strong>{e.score}</strong>
              <span class="grow muted">{e.notes ?? ''}</span>
              <button type="button" class="chip" aria-label="Denemeyi sil" onClick={() => deleteMockExam(e.id)}>×</button>
            </div>
          ))}
        </Card>
      </div>
      {editing && <CourseSheet course={course} open onClose={() => setEditing(false)} />}
    </Page>
  )
}
