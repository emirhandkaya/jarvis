import type { JSX } from 'preact'
import { useCheckin } from '../../db/repo/checkins'
import { useTasks, toggleDone } from '../../db/repo/tasks'
import { todayView } from '../../logic/tasks'
import { Card } from '../../ui/Card'
import { TaskRow } from '../tasks/TaskRow'
import { QuickAdd } from '../tasks/QuickAdd'
import { useNow } from '../../ui/useNow'
import { useEffect, useState } from 'preact/hooks'
import { useDueTopics } from '../../db/repo/topics'
import { useCourses } from '../../db/repo/courses'
import { useFocusSessions } from '../../db/repo/focus'
import { useSettings } from '../../db/repo/settings'
import { dayMinutes, nearestExam, weekMinutes } from '../../logic/study'
import { weekStart } from '../../logic/dates'
import { advance, remainingSec } from '../../logic/timer'
import { navigate } from '../../router'
import { ReviewChips } from '../study/ReviewChips'
import { useLiveQuery } from 'dexie-react-hooks'
import { useHabitLogs, useHabits } from '../../db/repo/habits'
import { gymStatus } from '../../db/repo/gym'
import { useHealth } from '../../db/repo/health'
import { todayList } from '../../logic/habits'
import { isMinimumDay } from '../../logic/checkin'
import { HabitCheck } from '../habits/HabitCheck'
import { DELOAD_NOTE } from '../gym/GymPage'

export interface CardDef { id: string; title: string; Component: () => JSX.Element | null }

function Oncelikler() {
  const { today } = useNow()
  const checkin = useCheckin(today)
  const tasks = useTasks()
  const prios = (checkin?.priorities ?? []).filter(p => p.trim())
  return (
    <Card title="Bugünün öncelikleri">
      {prios.length === 0 && <p class="muted">Check-in'de öncelik seçince burada görünür.</p>}
      {prios.map((p, i) => {
        const matches = (tasks ?? []).filter(t => t.title === p)
        const task = matches.find(t => !t.doneAt) ?? matches.find(t => t.plannedDate === today) ?? matches[0]
        const done = !!task?.doneAt
        return (
          <div class="task-row" key={i}>
            <button
              type="button" class={`task-circle${done ? ' done' : ''}`} disabled={!task}
              aria-label={done ? 'Geri al' : 'Tamamla'} onClick={() => task && toggleDone(task.id)}
            ><i /></button>
            <span class={`task-main t${done ? ' done-t' : ''}`}>{p}</span>
          </div>
        )
      })}
    </Card>
  )
}

function Gorevler() {
  const { today } = useNow()
  const tasks = useTasks()
  const view = todayView(tasks ?? [], today)
  const open = [...view.overdue, ...view.today]
  return (
    <Card title="Görevler">
      <QuickAdd defaultPlannedDate={today} />
      {open.length === 0 && <p class="muted">Bugün için açık görev yok.</p>}
      {view.overdue.length > 0 && <div class="group-title">Geciken</div>}
      {view.overdue.map(t => <TaskRow key={t.id} task={t} />)}
      {view.today.length > 0 && <div class="group-title">Bugün</div>}
      {view.today.map(t => <TaskRow key={t.id} task={t} />)}
    </Card>
  )
}

function Gunluk() {
  const c = useCheckin(useNow().today)
  const has = c?.energy !== undefined
  return (
    <Card title="Gün özeti">
      {!has ? <p class="muted">Henüz check-in yok.</p> : (
        <p style="margin: 0">
          Uyku: {c?.sleepHours !== undefined ? `${c.sleepHours} sa` : '—'} · Enerji: {c?.energy}/5 · Ruh hali: {c?.mood !== undefined ? `${c.mood}/5` : '—'}
        </p>
      )}
    </Card>
  )
}

function Tekrar() {
  const { today } = useNow()
  const due = useDueTopics(today)
  if (!due || due.length === 0) return null
  return (
    <Card title="Bugün tekrar">
      {due.slice(0, 5).map(({ topic, course }) => (
        <div key={topic.id} style="margin-bottom: 8px">
          <div class="row"><span class="tag-dot" style={`background: ${course.color}`} /><span class="grow">{topic.name}</span></div>
          <ReviewChips topicId={topic.id} today={today} />
        </div>
      ))}
      {due.length > 5 && <p class="muted">+{due.length - 5} konu daha</p>}
    </Card>
  )
}

function Sinav() {
  const { today } = useNow()
  const courses = useCourses()
  const next = nearestExam(courses ?? [], today)
  if (!next) return null
  return (
    <Card title="Sınav" onClick={() => navigate(`/ders/${next.course.id}`)}>
      {next.days === 0 ? `${next.course.name} sınavı bugün` : `${next.course.name} sınavına ${next.days} gün`}
    </Card>
  )
}

const fmtMin = (m: number) => m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m} dk`

function Odak() {
  const { today } = useNow()
  const sessions = useFocusSessions() ?? []
  const settings = useSettings()
  const [now, setNow] = useState(() => new Date())
  const timer = settings?.activeTimer ?? null
  useEffect(() => {
    if (!timer) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [!!timer])
  if (timer && settings) {
    const s = remainingSec(advance(timer, now, settings.pomodoro).timer, now, settings.pomodoro)
    const mmss = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
    return <Card title="Odak" onClick={() => navigate('/odak')}>{timer.paused ? 'Duraklatıldı' : 'Odak devam ediyor'} {mmss}</Card>
  }
  return (
    <Card title="Odak" onClick={() => navigate('/odak')}>
      Bugün {fmtMin(dayMinutes(sessions, today))} · Bu hafta {fmtMin(weekMinutes(sessions, weekStart(today)))}
    </Card>
  )
}

function Aliskanlik() {
  const { today } = useNow()
  const habits = useHabits()
  const logs = useHabitLogs() ?? []
  const checkin = useCheckin(today)
  const list = todayList(habits ?? [], logs, today)
  if (list.length === 0) return null
  return (
    <Card title="Alışkanlıklar">
      {isMinimumDay(checkin) && <p class="note">Minimum gün: minimum versiyonlar yeterli</p>}
      {list.map(it => <HabitCheck key={it.habit.id} item={it} today={today} />)}
    </Card>
  )
}

function Spor() {
  const { today } = useNow()
  const st = useLiveQuery(() => gymStatus(today), [today])
  if (!st) return null
  return (
    <Card title="Spor">
      <div>Bu hafta {st.weekCount} / {st.target}</div>
      {st.todayDone
        ? <div>Bugün antrenman yapıldı ✓</div>
        : <a class="btn btn-ghost" href="#/spor/yeni" style="display: inline-block; margin-top: 6px">Antrenmana başla</a>}
      {st.deload && <p class="note" style="margin: 8px 0 0">{DELOAD_NOTE[st.deload]}</p>}
    </Card>
  )
}

const hm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`

function Saglik() {
  const h = useHealth(useNow().today)
  if (!h) return null
  const parts = [
    h.sleepMin !== undefined && `Uyku ${hm(h.sleepMin)}`,
    h.steps !== undefined && `${h.steps.toLocaleString('tr-TR')} adım`,
    h.hrvMs !== undefined && `HRV ${h.hrvMs} ms`,
    h.restingHr !== undefined && `Nabız ${h.restingHr}`,
  ].filter(Boolean)
  if (parts.length === 0) return null
  return <Card title="Sağlık">{parts.join(' · ')}</Card>
}

// Sonraki planlar buraya kart ekler.
export const CARDS: CardDef[] = [
  { id: 'oncelikler', title: 'Öncelikler', Component: Oncelikler },
  { id: 'gorevler', title: 'Görevler', Component: Gorevler },
  { id: 'gunluk', title: 'Gün özeti', Component: Gunluk },
  { id: 'tekrar', title: 'Tekrar', Component: Tekrar },
  { id: 'sinav', title: 'Sınav', Component: Sinav },
  { id: 'odak', title: 'Odak', Component: Odak },
  { id: 'aliskanlik', title: 'Alışkanlıklar', Component: Aliskanlik },
  { id: 'spor', title: 'Spor', Component: Spor },
  { id: 'saglik', title: 'Sağlık', Component: Saglik },
]
