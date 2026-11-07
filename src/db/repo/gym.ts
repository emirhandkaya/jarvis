import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'
import { newRecord, touch } from '../meta'
import { getSettings } from './settings'
import type { Exercise, Template, Workout, WorkoutSet } from '../types'
import { addDays, weekStart } from '../../logic/dates'
import { deloadReason, setVolume } from '../../logic/progression'

type ExerciseFields = Pick<Exercise, 'name' | 'group' | 'repMin' | 'repMax' | 'incrementKg'>

const SEED: { template: string; items: [string, string, number, number, number][] }[] = [
  { template: 'Push', items: [
    ['Bench Press', 'Göğüs', 8, 12, 2.5], ['Overhead Press', 'Omuz', 8, 12, 2.5],
    ['Incline Dumbbell Press', 'Göğüs', 8, 12, 2], ['Triceps Pushdown', 'Arka kol', 10, 15, 2.5],
  ] },
  { template: 'Pull', items: [
    ['Barbell Row', 'Sırt', 8, 12, 2.5], ['Lat Pulldown', 'Sırt', 8, 12, 2.5],
    ['Face Pull', 'Omuz', 12, 15, 2.5], ['Biceps Curl', 'Ön kol', 10, 15, 1],
  ] },
  { template: 'Bacak', items: [
    ['Squat', 'Bacak', 6, 10, 2.5], ['Romanian Deadlift', 'Bacak', 8, 12, 2.5],
    ['Leg Press', 'Bacak', 10, 15, 5], ['Calf Raise', 'Bacak', 12, 20, 2.5],
  ] },
]

export async function seedGymIfEmpty(): Promise<void> {
  await db.transaction('rw', db.exercises, db.templates, async () => {
    if ((await db.exercises.count()) > 0) return
    for (const t of SEED) {
      const items: Template['items'] = []
      for (const [name, group, repMin, repMax, incrementKg] of t.items) {
        const e: Exercise = newRecord({ name, group, repMin, repMax, incrementKg })
        await db.exercises.add(e)
        items.push({ exerciseId: e.id, sets: 3 })
      }
      await db.templates.add(newRecord({ name: t.template, items }))
    }
  })
}

export async function addExercise(fields: ExerciseFields): Promise<Exercise> {
  const e: Exercise = newRecord({ ...fields })
  await db.exercises.add(e)
  return e
}

export async function updateExercise(id: string, patch: Partial<ExerciseFields>): Promise<void> {
  const cur = await db.exercises.get(id)
  if (cur) await db.exercises.put(touch({ ...cur, ...patch }))
}

export async function addTemplate(name: string, items: Template['items']): Promise<Template> {
  const t: Template = newRecord({ name, items })
  await db.templates.add(t)
  return t
}

export async function updateTemplate(id: string, patch: Partial<Pick<Template, 'name' | 'items'>>): Promise<void> {
  const cur = await db.templates.get(id)
  if (cur) await db.templates.put(touch({ ...cur, ...patch }))
}

export const deleteTemplate = (id: string) => db.templates.delete(id)

export async function startWorkout(date: string, templateId?: string, isDeload = false): Promise<Workout> {
  const w: Workout = newRecord({ date, templateId, isDeload })
  await db.workouts.add(w)
  return w
}

export async function logSet(workoutId: string, exerciseId: string, weightKg: number, reps: number): Promise<WorkoutSet> {
  return db.transaction('rw', db.sets, async () => {
    const order = await db.sets.where('workoutId').equals(workoutId).filter(s => s.exerciseId === exerciseId).count()
    const s: WorkoutSet = newRecord({ workoutId, exerciseId, order, weightKg, reps })
    await db.sets.add(s)
    return s
  })
}

export async function updateSet(id: string, patch: Partial<Pick<WorkoutSet, 'weightKg' | 'reps' | 'rpe'>>): Promise<void> {
  const cur = await db.sets.get(id)
  if (cur) await db.sets.put(touch({ ...cur, ...patch }))
}

export const deleteSet = (id: string) => db.sets.delete(id)

export async function finishWorkout(id: string): Promise<'saved' | 'discarded'> {
  return db.transaction('rw', db.workouts, db.sets, async () => {
    if ((await db.sets.where('workoutId').equals(id).count()) === 0) {
      await db.workouts.delete(id)
      return 'discarded' as const
    }
    return 'saved' as const
  })
}

export async function exerciseHistory(
  exerciseId: string,
  excludeWorkoutId?: string,
): Promise<{ last: WorkoutSet[]; prev: WorkoutSet[] }> {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray()
  const byWorkout = new Map<string, WorkoutSet[]>()
  for (const s of sets) {
    if (s.workoutId === excludeWorkoutId) continue
    byWorkout.set(s.workoutId, [...(byWorkout.get(s.workoutId) ?? []), s])
  }
  const workouts = (await db.workouts.bulkGet([...byWorkout.keys()])).filter((w): w is Workout => !!w)
  workouts.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  const pick = (w?: Workout) => (w ? byWorkout.get(w.id)!.sort((a, b) => a.order - b.order) : [])
  return { last: pick(workouts[0]), prev: pick(workouts[1]) }
}

export async function gymStatus(today: string): Promise<{
  weekCount: number
  target: number
  deload: 'zaman' | 'yorgunluk' | null
  lastWorkoutDate?: string
  todayDone: boolean
}> {
  const [settings, workouts, setRows, checkins] = await Promise.all([
    getSettings(),
    db.workouts.toArray(),
    db.sets.toArray(),
    db.checkins.where('date').between(addDays(today, -2), today, true, true).toArray(),
  ])
  const withSets = new Set(setRows.map(s => s.workoutId))
  const done = workouts.filter(w => withSets.has(w.id)).sort((a, b) => a.date.localeCompare(b.date))
  const ws = weekStart(today)
  const we = addDays(ws, 6)
  const deloads = done.filter(w => w.isDeload)
  const energies = checkins.filter(c => c.energy !== undefined).sort((a, b) => a.date.localeCompare(b.date)).map(c => c.energy!)
  return {
    weekCount: done.filter(w => w.date >= ws && w.date <= we).length,
    target: settings.weeklyWorkoutTarget,
    deload: deloadReason(deloads.at(-1)?.date, done[0]?.date, today, energies),
    lastWorkoutDate: done.at(-1)?.date,
    todayDone: done.some(w => w.date === today),
  }
}

export async function weeklyVolume(weeks: number, today: string): Promise<number[]> {
  const first = addDays(weekStart(today), -7 * (weeks - 1))
  const workouts = await db.workouts.where('date').aboveOrEqual(first).toArray()
  const dateOf = new Map(workouts.map(w => [w.id, w.date]))
  const sets = await db.sets.where('workoutId').anyOf([...dateOf.keys()]).toArray()
  const out = Array<number>(weeks).fill(0)
  for (const s of sets) {
    const idx = Math.floor(
      (Date.parse(dateOf.get(s.workoutId)! + 'T00:00:00Z') - Date.parse(first + 'T00:00:00Z')) / (7 * 86400000),
    )
    if (idx >= 0 && idx < weeks) out[idx] += setVolume([s])
  }
  return out
}

export const useExercises = (): Exercise[] | undefined => useLiveQuery(() => db.exercises.toArray(), [])
export const useTemplates = (): Template[] | undefined => useLiveQuery(() => db.templates.toArray(), [])
export const useWorkouts = (): Workout[] | undefined => useLiveQuery(() => db.workouts.toArray(), [])
export const useWorkoutSets = (workoutId: string): WorkoutSet[] | undefined =>
  useLiveQuery(() => db.sets.where('workoutId').equals(workoutId).toArray(), [workoutId])
