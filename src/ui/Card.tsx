import type { ComponentChildren } from 'preact'

interface Props { title?: string; onClick?: () => void; children?: ComponentChildren }

export function Card({ title, onClick, children }: Props) {
  const body = (
    <>
      {title && <h3 class="card-title">{title}</h3>}
      {children}
    </>
  )
  return onClick
    ? <button type="button" class="card card-click" onClick={onClick}>{body}</button>
    : <section class="card">{body}</section>
}
