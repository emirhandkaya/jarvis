import type { ComponentChildren } from 'preact'

interface Props { open: boolean; onClose: () => void; title?: string; children?: ComponentChildren }

export function Sheet({ open, onClose, title, children }: Props) {
  if (!open) return null
  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div class="sheet-grip" />
        {title && <h2 class="sheet-title">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
