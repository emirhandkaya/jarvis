export interface Base { id: string; createdAt: string; updatedAt: string }
export type Tag = 'ders' | 'spor' | 'kisisel' | 'is'

export interface Setting { key: string; value: unknown }
export interface Checkin {
  date: string
  sleepHours?: number
  energy?: number
  mood?: number
  priorities: string[]
  wins?: string
  learned?: string
  tomorrowFirst?: string
  createdAt: string
  updatedAt: string
}
export interface Goal extends Base {
  kind: 'identity' | 'cycle' | 'week'
  title: string
  parentId?: string
  start?: string
  end?: string
  status: string
}
export interface Task extends Base {
  title: string
  tag: Tag
  priority: 1 | 2 | 3
  dueDate?: string
  plannedDate?: string
  estimateMin?: number
  energy: 'high' | 'low'
  goalId?: string
  doneAt?: string
}
export interface Course extends Base {
  name: string
  color: string
  examDate?: string
  weeklyTargetMin: number
}
export interface Topic extends Base {
  courseId: string
  name: string
  stage: 0 | 1 | 2 | 3 | 4 | 5
  lastReviewedAt?: string
  nextReviewDate?: string
  archived: boolean
}
export interface FocusSession extends Base {
  startedAt: string
  endedAt: string
  minutes: number
  mode: 'pomodoro' | 'serbest' | 'karisik'
  courseId?: string
  topicIds: string[]
  taskId?: string
  recall: string[]
  rating?: 'kolay' | 'orta' | 'zor'
}
export interface Exercise extends Base {
  name: string
  group: string
  repMin: number
  repMax: number
  incrementKg: number
}
export interface Template extends Base {
  name: string
  items: { exerciseId: string; sets: number }[]
}
export interface Workout extends Base {
  date: string
  templateId?: string
  readiness?: number
  isDeload: boolean
  notes?: string
}
export interface WorkoutSet extends Base {
  workoutId: string
  exerciseId: string
  order: number
  weightKg: number
  reps: number
  rpe?: number
}
export type HabitSchedule = { type: 'days'; days: number[] } | { type: 'perWeek'; n: number }
export interface Habit extends Base {
  name: string
  ifThen: string
  minVersion: string
  schedule: HabitSchedule
  archived: boolean
}
export interface HabitLog extends Base {
  habitId: string
  date: string
  status: 'done' | 'min' | 'joker'
}
export interface Block extends Base {
  date?: string
  repeatDays?: number[]
  start: string
  end: string
  title: string
  kind: 'ders' | 'spor' | 'is' | 'mola' | 'diger'
  refId?: string
}
export interface HealthDay {
  date: string
  sleepMin?: number
  steps?: number
  activeKcal?: number
  restingHr?: number
  hrvMs?: number
  source: string
  createdAt: string
  updatedAt: string
}
export interface Review {
  weekStart: string
  wentWell: string
  toImprove: string
  nextFocus: string
  goalIds: string[]
  createdAt: string
  updatedAt: string
}
export interface MockExam extends Base {
  courseId: string
  date: string
  score: number
  notes?: string
}
