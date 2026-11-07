import { useEffect, useRef, useState } from 'preact/hooks'
import type { Block } from '../../db/types'
import { DAY_END, DAY_START, layoutDay, moveBlock, resizeBlock, toMin } from '../../logic/blocks'

const LABEL_W = 44
const HOLD_MS = 250
const MOVE_TOLERANCE = 8
const HANDLE_PX = 24

interface Props {
  blocks: Block[]
  isToday: boolean
  nowMin: number
  scrollToMin: number
  onTapEmpty: (startMin: number) => void
  onEdit: (b: Block) => void
  onCommit: (b: Block, next: { start: string; end: string }) => void
}

export function Timeline({ blocks, isToday, nowMin, scrollToMin, onTapEmpty, onEdit, onCommit }: Props) {
  const anchor = useRef<HTMLDivElement>(null)
  useEffect(() => { anchor.current?.scrollIntoView({ block: 'start' }) }, [])

  const onGridClick = (e: MouseEvent) => {
    if (e.target !== e.currentTarget) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    onTapEmpty(Math.min(DAY_END - 15, DAY_START + Math.floor(y / 15) * 15))
  }

  const hours: number[] = []
  for (let h = DAY_START / 60; h <= DAY_END / 60; h++) hours.push(h)

  return (
    <div class="tl" style={`height: ${DAY_END - DAY_START}px`} onClick={onGridClick}>
      <div ref={anchor} class="tl-anchor" style={`top: ${Math.max(0, scrollToMin - DAY_START - 60)}px`} />
      {hours.map(h => (
        <div key={h} class="tl-hour" style={`top: ${(h - DAY_START / 60) * 60}px`}>
          <span>{String(h).padStart(2, '0')}:00</span>
        </div>
      ))}
      {layoutDay(blocks).map(({ block, col, cols }) => (
        <BlockView key={block.id} block={block} col={col} cols={cols} onEdit={onEdit} onCommit={onCommit} />
      ))}
      {isToday && nowMin >= DAY_START && nowMin <= DAY_END && (
        <div class="tl-now" style={`top: ${nowMin - DAY_START}px`} />
      )}
    </div>
  )
}

interface BV {
  block: Block; col: number; cols: number
  onEdit: (b: Block) => void
  onCommit: (b: Block, next: { start: string; end: string }) => void
}

function BlockView({ block, col, cols, onEdit, onCommit }: BV) {
  const el = useRef<HTMLButtonElement>(null)
  const st = useRef({ timer: 0, active: false, cancelled: false, mode: 'move' as 'move' | 'resize', y0: 0, x0: 0, suppress: false })
  const [preview, setPreview] = useState<{ start: string; end: string } | null>(null)
  const [dragging, setDragging] = useState(false)
  const previewRef = useRef<typeof preview>(null)

  // Parmak kaldırılmadan sayfa kaymasını durdurmak için (touch-action sonradan değişse de çalışır).
  useEffect(() => {
    const node = el.current
    if (!node) return
    const stop = (e: TouchEvent) => { if (st.current.active && e.cancelable) e.preventDefault() }
    node.addEventListener('touchmove', stop, { passive: false })
    return () => node.removeEventListener('touchmove', stop)
  }, [])
  useEffect(() => () => clearTimeout(st.current.timer), [])

  const s = st.current
  const shown = preview ?? block
  const top = toMin(shown.start) - DAY_START
  const height = Math.max(15, toMin(shown.end) - toMin(shown.start))

  useEffect(() => { setPreview(null) }, [block.start, block.end])

  const finish = (commit: boolean) => {
    let keepPreview = false
    clearTimeout(s.timer)
    if (s.active) {
      s.suppress = true
      setTimeout(() => { s.suppress = false }, 50)
      const p = previewRef.current
      if (commit && p && (p.start !== block.start || p.end !== block.end)) {
        onCommit(block, p)
        keepPreview = true // props güncellenene kadar önizleme kalsın
      }
    }
    s.active = false
    previewRef.current = null
    if (!keepPreview) setPreview(null)
    setDragging(false)
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const node = e.currentTarget as HTMLElement
    const rect = node.getBoundingClientRect()
    const handle = Math.min(HANDLE_PX, rect.height / 3)
    s.mode = e.clientY >= rect.bottom - handle ? 'resize' : 'move'
    s.y0 = e.clientY; s.x0 = e.clientX; s.cancelled = false; s.active = false
    const id = e.pointerId
    clearTimeout(s.timer)
    s.timer = window.setTimeout(() => {
      s.active = true
      setDragging(true)
      try { node.setPointerCapture(id) } catch { /* pointer artık yok */ }
      if (navigator.vibrate) navigator.vibrate(10)
    }, HOLD_MS)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!s.active) {
      if (!s.cancelled && Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > MOVE_TOLERANCE) {
        s.cancelled = true
        clearTimeout(s.timer)
      }
      return
    }
    if (e.pointerType === 'mouse' && e.buttons === 0) { finish(false); return }
    e.preventDefault()
    const d = e.clientY - s.y0
    const next = s.mode === 'move' ? moveBlock(block, d) : resizeBlock(block, d)
    previewRef.current = next
    setPreview(next)
  }

  const left = `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${col / cols})`
  const width = `calc((100% - ${LABEL_W}px) / ${cols} - 2px)`
  return (
    <button
      ref={el} type="button"
      class={`tl-block blk-${block.kind}${dragging ? ' is-dragging' : ''}`}
      style={`top: ${top}px; height: ${height}px; left: ${left}; width: ${width};${dragging ? ' touch-action: none;' : ''}`}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={() => finish(true)} onPointerCancel={() => finish(false)}
      onContextMenu={e => e.preventDefault()}
      onClick={() => { if (!s.suppress) onEdit(block) }}
    >
      <span class="tl-title">{block.title}{block.repeatDays?.length ? ' ↻' : ''}</span>
      {height >= 30 && <span class="tl-time">{shown.start}–{shown.end}</span>}
      {height >= 30 && <i class="tl-grip" />}
    </button>
  )
}
