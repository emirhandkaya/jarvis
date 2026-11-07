export function newRecord<T extends object>(fields: T): T & { id: string; createdAt: string; updatedAt: string } {
  const now = new Date().toISOString()
  return { ...fields, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
}

export function touch<T extends object>(rec: T): T {
  return { ...rec, updatedAt: new Date().toISOString() }
}
