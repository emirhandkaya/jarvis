interface Props {
  values: number[]
  labels?: string[]
  height?: number
  horizontal?: boolean
  max?: number
  color?: string
  colors?: string[]
}

export function Bars({ values, labels, height = 96, horizontal = false, max, color = 'var(--accent)', colors }: Props) {
  const top = max ?? Math.max(0, ...values)
  if (values.length === 0 || top <= 0) return <p class="muted" style="margin: 0">Veri yok</p>
  if (horizontal) {
    return (
      <div role="img" aria-label="Çubuk grafik">
        {values.map((v, i) => (
          <div key={i} style="margin-bottom: 8px">
            {labels?.[i] && <div style="font-size: .85rem; margin-bottom: 2px">{labels[i]}</div>}
            <div style="height: 8px; border-radius: 4px; background: var(--bg); overflow: hidden">
              <div style={`height: 100%; width: ${Math.min(100, (v / top) * 100).toFixed(1)}%; background: ${colors?.[i] ?? color}`} />
            </div>
          </div>
        ))}
      </div>
    )
  }
  const n = values.length
  const W = 300
  const slot = W / n
  const bw = slot * 0.7
  const base = height - 14
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label="Çubuk grafik">
      {values.map((v, i) => {
        const h = (v / top) * (base - 2)
        return <rect key={i} x={i * slot + (slot - bw) / 2} y={base - h} width={bw} height={h} rx="1.5" fill={colors?.[i] ?? color} />
      })}
      {labels?.map((l, i) => l && (
        <text key={i} x={i * slot + slot / 2} y={height - 2} text-anchor="middle" font-size="8" fill="var(--muted)">{l}</text>
      ))}
    </svg>
  )
}
