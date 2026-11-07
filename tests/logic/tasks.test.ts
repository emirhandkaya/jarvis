import { todayView, goalChain } from '../../src/logic/tasks'
import type { Task, Goal } from '../../src/db/types'

test('todayView geciken, bugün, biten ayırır', () => {
  const t = (o: Partial<Task>) => ({ id: crypto.randomUUID(), title: 'x', tag: 'kisisel', priority: 2, energy: 'low', createdAt: '2026-11-01T00:00:00Z', updatedAt: '', ...o }) as Task
  const v = todayView([t({ plannedDate: '2026-11-06' }), t({ dueDate: '2026-11-07', priority: 1 }), t({ plannedDate: '2026-11-07', priority: 3 }), t({ plannedDate: '2026-11-07', doneAt: '2026-11-07T10:00:00' })], '2026-11-07')
  expect(v.overdue).toHaveLength(1)
  expect(v.today.map(x => x.priority)).toEqual([1, 3])
  expect(v.done).toHaveLength(1)
})
test('goalChain kökten yaprağa', () => {
  const g = (id: string, kind: Goal['kind'], parentId?: string) => ({ id, kind, title: id, parentId, status: 'active' }) as Goal
  const goals = [g('w', 'week', 'c'), g('i', 'identity'), g('c', 'cycle', 'i')]
  expect(goalChain(goals, 'w').map(x => x.id)).toEqual(['i', 'c', 'w'])
  expect(goalChain(goals, 'yok')).toEqual([])
})
