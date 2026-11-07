import type { ComponentChildren } from 'preact'

interface Props {
  variant?: 'primary' | 'ghost' | 'danger'
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: (e: MouseEvent) => void
  class?: string
  children?: ComponentChildren
  'aria-label'?: string
}

export function Button({ variant = 'primary', type = 'button', class: cls = '', children, ...rest }: Props) {
  return <button type={type} class={`btn btn-${variant} ${cls}`} {...rest}>{children}</button>
}
