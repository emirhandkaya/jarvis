import { useEffect, useRef, useState } from 'preact/hooks'
import type { Block } from '../../db/types'
import { addBlock, updateBlock, useBlocksOn } from '../../db/repo/blocks'
import { useTasks } from '../../db/repo/tasks'
import { useCourses } from '../../db/repo/courses'
import { useFocusSessions } from '../../db/repo/focus'
import { useSettings } from '../../db/repo/settings'
import { todayView } from '../../logic/tasks'
import { addDays } from '../../logic/dates'
import { weekday } from '../../logic/habits'
import {
  DAY_END, DAY_START, capacity, nowMinutes, peakWindow, snap, suggestSlot, toHHMM, toMin,
} from '../../logic/blocks'
import { Page } from '../../ui/Page'
import { Button } from '../../ui/Button'
import { useNow } from '../../ui/useNow'
import { Timeline } from './Timeline'
import { BlockSheet } from './BlockSheet'
import { PlaceTray, itemId, itemKind, itemMinutes, itemTitle, type PlaceItem } from './PlaceTray'

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

function fmtDay(date: string): string {
  const [, m, d] = date.split('-').map(Number)
  return `${DAY_NAMES[weekday(date) - 1]}, ${d} ${MONTHS[m - 1]}`
}

type SheetState = { block?: Block; start?: string } | null

export function PlanPage() {
  const { now, today } = useNow()
  const [date, setDate] = useState(today)
  const prevToday = useRef(today)
  useEffect(() => {
    if (prevToday.current !== today) {
      setDate(d => (d === prevToday.current ? today : d))
      prevToday.current = today
    }
  }, [today])
  const [sheet, setSheet] = useState<SheetState>(null)
  const [selected, setSelected] = useState<PlaceItem | null>(null)
  const [note, setNote] = useState('')
  const blocks = useBlocksOn(date) ?? []
  const tasks = useTasks() ?? []
  const courses = useCourses() ?? []
  const sessions = useFocusSessions() ?? []
  const settings = useSettings()

  useEffect(() => {
    if (!note) return
    const id = setTimeout(() => setNote(''), 3000)
    return () => clearTimeout(id)
  }, [note])

  const isToday = date === today
  const nowMin = nowMinutes(now)
  const view = todayView(tasks, date)
  const open = [...view.overdue, ...view.today]
  const linked = new Set(blocks.map(b => b.refId).filter(Boolean))
  const trayTasks = open.filter(t => !linked.has(t.id))
  const cap = capacity(blocks, open, settings?.wakeTime ?? '07:00', settings?.sleepTime ?? '23:00')
  const peak = peakWindow(sessions, today)
  const wakeMin = toMin(settings?.wakeTime ?? '07:00')

  const afterMin = isToday ? Math.ceil(Math.max(nowMin, DAY_START) / 15) * 15 : DAY_START
  const suggestion = selected ? suggestSlot(blocks, itemMinutes(selected), peak, afterMin) : null

  const placeAt = async (startMin: number, item: PlaceItem) => {
    const dur = itemMinutes(item)
    const start = Math.max(DAY_START, Math.min(snap(startMin), DAY_END - dur))
    await addBlock({
      date, start: toHHMM(start), end: toHHMM(start + dur),
      title: itemTitle(item), kind: itemKind(item), refId: itemId(item),
    })
    setSelected(null)
  }

  const onTapEmpty = (m: number) => {
    if (selected) void placeAt(m, selected)
    else setSheet({ start: toHHMM(m) })
  }

  const onCommit = async (b: Block, next: { start: string; end: string }) => {
    if (next.start === b.start && next.end === b.end) return
    await updateBlock(b.id, next)
    if (b.repeatDays?.length) setNote('Tekrarlayan blok: tüm günler güncellendi')
  }

  return (
    <Page title={fmtDay(date)}>
      <div class="row" style="margin-bottom: 12px">
        <Button variant="ghost" aria-label="Önceki gün" onClick={() => setDate(addDays(date, -1))}>‹</Button>
        <Button variant="ghost" class="grow" onClick={() => setDate(today)} disabled={isToday}>Bugün</Button>
        <Button variant="ghost" aria-label="Sonraki gün" onClick={() => setDate(addDays(date, 1))}>›</Button>
      </div>
      {cap.over && <p class="note">Bugün {(cap.plannedMin / 60).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} saat planladın, gerçekçi mi?</p>}
      {note && <p class="note" role="status">{note}</p>}
      <PlaceTray
        tasks={trayTasks} courses={courses} selected={selected} peak={peak} suggestion={suggestion}
        onSelect={setSelected}
        onSuggest={() => { if (selected && suggestion) void placeAt(toMin(suggestion), selected) }}
      />
      <Timeline
        key={date}
        blocks={blocks} isToday={isToday} nowMin={nowMin}
        scrollToMin={isToday && nowMin <= DAY_END ? nowMin : wakeMin}
        onTapEmpty={onTapEmpty}
        onEdit={b => setSheet({ block: b })}
        onCommit={onCommit}
      />
      {sheet && (
        <BlockSheet
          key={sheet.block?.id ?? sheet.start}
          date={date} block={sheet.block} initialStart={sheet.start}
          tasks={open} courses={courses}
          onClose={() => setSheet(null)} onNote={setNote}
        />
      )}
    </Page>
  )
}
