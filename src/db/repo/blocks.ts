import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'
import { newRecord, touch } from '../meta'
import type { Block } from '../types'
import { blocksForDay, toMin } from '../../logic/blocks'

type BlockFields = Pick<Block, 'start' | 'end' | 'title' | 'kind'> & Partial<Pick<Block, 'date' | 'repeatDays' | 'refId'>>

export async function addBlock(fields: BlockFields): Promise<Block | null> {
  const title = fields.title.trim()
  if (!title || toMin(fields.end) <= toMin(fields.start)) return null
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined))
  const block = newRecord({ ...clean, title }) as Block
  await db.blocks.add(block)
  return block
}

export async function updateBlock(id: string, patch: Partial<Block>): Promise<void> {
  const cur = await db.blocks.get(id)
  if (!cur) return
  await db.blocks.put(touch({ ...cur, ...patch, id }))
}

export async function deleteBlock(id: string, scope: 'series' | 'day', date?: string): Promise<void> {
  const cur = await db.blocks.get(id)
  if (!cur) return
  if (scope === 'day' && cur.repeatDays?.length && date) {
    await updateBlock(id, { skipDates: [...new Set([...(cur.skipDates ?? []), date])] })
    return
  }
  await db.blocks.delete(id)
}

export async function blocksOn(date: string): Promise<Block[]> {
  return blocksForDay(await db.blocks.toArray(), date)
}

export function useBlocksOn(date: string): Block[] | undefined {
  return useLiveQuery(() => blocksOn(date), [date])
}
