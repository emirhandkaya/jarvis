import { useState } from 'preact/hooks'
import { applyRestart } from '../../db/repo/reviews'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'

export function RestartCard() {
  const [done, setDone] = useState(false)
  const reduce = async () => {
    await applyRestart()
    setDone(true)
  }
  return (
    <Card title="Yeniden başla">
      <p style="margin-top: 0">Zor bir hafta oldu, sorun değil. Hedefleri küçültüp yeniden başlayalım.</p>
      {done
        ? <p class="note">Ders hedefleri %30 azaltıldı, spor hedefi 1 azaltıldı</p>
        : <Button onClick={reduce}>Hedefleri küçült</Button>}
      <a class="btn btn-ghost" href="#/aliskanlik" style="display: inline-flex; align-items: center; margin-top: 8px; text-decoration: none">
        Minimum versiyonlarla başla
      </a>
    </Card>
  )
}
