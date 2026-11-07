import type { DayPrompt } from '../../logic/checkin'
import { navigate } from '../../router'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'

const COPY: Record<NonNullable<DayPrompt>, { text: string; label: string; to: string }> = {
  checkin: { text: 'Güne başlamadan önce kısa bir check-in.', label: 'Güne başla', to: '/checkin' },
  kapanis: { text: 'Gün bitti mi? Üç satırla kapat.', label: 'Günü kapat', to: '/kapanis' },
  degerlendirme: { text: 'Pazar: haftaya bir bak.', label: 'Haftayı değerlendir', to: '/degerlendirme' },
}

export function PromptBanner({ prompt }: { prompt: DayPrompt }) {
  if (!prompt) return null
  const c = COPY[prompt]
  return (
    <Card>
      <p style="margin: 0 0 10px">{c.text}</p>
      <Button onClick={() => navigate(c.to)}>{c.label}</Button>
    </Card>
  )
}
