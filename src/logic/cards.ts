export function orderCards(allIds: string[], order: string[], hidden: string[]): string[] {
  const known = new Set(allIds)
  const ordered = order.filter((id, i) => known.has(id) && order.indexOf(id) === i)
  const rest = allIds.filter(id => !ordered.includes(id))
  return [...ordered, ...rest].filter(id => !hidden.includes(id))
}
