import type { ComponentChildren } from 'preact'

interface Props { title: string; actions?: ComponentChildren; children?: ComponentChildren }

export function Page({ title, actions, children }: Props) {
  return (
    <main class="page">
      <header class="page-head">
        <h1>{title}</h1>
        <div class="page-actions">{actions}</div>
      </header>
      {children}
    </main>
  )
}
