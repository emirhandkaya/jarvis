import Dexie, { type Table } from 'dexie'
import type {
  Setting, Checkin, Goal, Task, Course, Topic, FocusSession, Exercise, Template,
  Workout, WorkoutSet, Habit, HabitLog, Block, HealthDay, Review, MockExam,
} from './types'

import { SCHEMA_VERSION } from './version'
export { SCHEMA_VERSION }

export class JarvisDB extends Dexie {
  settings!: Table<Setting, string>
  checkins!: Table<Checkin, string>
  goals!: Table<Goal, string>
  tasks!: Table<Task, string>
  courses!: Table<Course, string>
  topics!: Table<Topic, string>
  focusSessions!: Table<FocusSession, string>
  exercises!: Table<Exercise, string>
  templates!: Table<Template, string>
  workouts!: Table<Workout, string>
  sets!: Table<WorkoutSet, string>
  habits!: Table<Habit, string>
  habitLogs!: Table<HabitLog, string>
  blocks!: Table<Block, string>
  health!: Table<HealthDay, string>
  reviews!: Table<Review, string>
  mockExams!: Table<MockExam, string>

  constructor() {
    super('jarvis')
    this.version(1).stores({
      settings: 'key',
      checkins: 'date',
      goals: 'id, kind, parentId',
      tasks: 'id, plannedDate, dueDate, doneAt, goalId',
      courses: 'id',
      topics: 'id, courseId, nextReviewDate',
      focusSessions: 'id, startedAt, courseId',
      exercises: 'id',
      templates: 'id',
      workouts: 'id, date',
      sets: 'id, workoutId, exerciseId',
      habits: 'id',
      habitLogs: 'id, &[habitId+date], date',
      blocks: 'id, date',
      health: 'date',
      reviews: 'weekStart',
    })
    this.version(2).stores({ mockExams: 'id, courseId, date' })
  }
}

export const db = new JarvisDB()
