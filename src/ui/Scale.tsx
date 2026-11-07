interface Props {
  value?: number
  onChange: (v: number) => void
  max?: number
  labels?: [string, string]
}

export function Scale({ value, onChange, max = 5, labels }: Props) {
  const items = Array.from({ length: max }, (_, i) => i + 1)
  return (
    <div>
      <div class="scale" role="radiogroup">
        {items.map(n => (
          <button key={n} type="button" role="radio" aria-checked={value === n} class={value === n ? 'on' : ''} onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
      </div>
      {labels && <div class="scale-labels"><span>{labels[0]}</span><span>{labels[1]}</span></div>}
    </div>
  )
}
