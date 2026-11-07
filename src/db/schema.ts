import Dexie, { type Table } from 'dexie'
import type {
  Setting, Checkin, Goal, Task, Course, Topic, FocusSession, Exercise, Template,
  Workout, WorkoutSet, Habit, HabitLog, Block, HealthDay, Review,
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

  constructor() {
    super('jarvis')
    this.version(SCHEMA_VERSION).stores({
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
  }
}

export const db = new JarvisDB()
