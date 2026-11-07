import { useState } from 'preact/hooks'
import { useSettings, setSetting } from '../../db/repo/settings'
import { useCheckin } from '../../db/repo/checkins'
import { useNow } from '../../ui/useNow'
import { dayPrompt, isMinimumDay } from '../../logic/checkin'
import { needsBackupReminder } from '../../logic/backup'
import { orderCards } from '../../logic/cards'
import { Page } from '../../ui/Page'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { PromptBanner } from './PromptBanner'
import { CARDS } from './cards'

function dayDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const ALL_IDS = CARDS.map(c => c.id)

function greeting(h: number) {
  if (h < 4) return 'İyi geceler'
  if (h < 12) return 'Günaydın'
  if (h < 18) return 'İyi günler'
  return 'İyi akşamlar'
}

function CardEditor() {
  const s = useSettings()
  if (!s) return null
  const order = orderCards(ALL_IDS, s.cardOrder, [])
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    setSetting('cardOrder', next)
  }
  const toggle = (id: string) =>
    setSetting('hiddenCards', s.hiddenCards.includes(id) ? s.hiddenCards.filter(x => x !== id) : [...s.hiddenCards, id])
  return (
    <Card title="Kartları düzenle">
      {order.map((id, i) => {
        const def = CARDS.find(c => c.id === id)!
        const hidden = s.hiddenCards.includes(id)
        return (
          <div class="row" key={id}>
            <span class="grow" style={hidden ? 'opacity: .5' : ''}>{def.title}</span>
            <Button variant="ghost" aria-label="Yukarı taşı" onClick={() => move(i, -1)}>↑</Button>
            <Button variant="ghost" aria-label="Aşağı taşı" onClick={() => move(i, 1)}>↓</Button>
            <Button variant="ghost" onClick={() => toggle(id)}>{hidden ? 'Göster' : 'Gizle'}</Button>
          </div>
        )
      })}
    </Card>
  )
}

export function TodayPage() {
  const { now, today } = useNow()
  const checkin = useCheckin(today)
  const settings = useSettings()
  const [editing, setEditing] = useState(false)

  // Haftalık değerlendirme ekranı Plan 5'te gelecek; şimdilik hep "yapıldı".
  const prompt = dayPrompt(now, checkin, true)
  const ids = orderCards(ALL_IDS, settings?.cardOrder ?? [], settings?.hiddenCards ?? [])
  const dateLabel = dayDate(today).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <Page title="Bugün">
      <p class="muted" style="margin-top: 0">{greeting(now.getHours())} · {dateLabel}</p>
      <div class="stack">
        <PromptBanner prompt={prompt} />
        {isMinimumDay(checkin) && (
          <p class="note">Enerjin düşük: bugün "Minimum gün". Sadece en önemli bir iş yeter.</p>
        )}
        {settings && needsBackupReminder(settings.lastBackupAt, today) && (
          <p class="note">Yedek almayı unutma: <a href="#/ayarlar">Ayarlar</a></p>
        )}
        {ids.map(id => {
          const { Component } = CARDS.find(c => c.id === id)!
          return <Component key={id} />
        })}
        {editing && <CardEditor />}
        <Button variant="ghost" onClick={() => setEditing(e => !e)}>{editing ? 'Düzenlemeyi bitir' : 'Kartları düzenle'}</Button>
      </div>
    </Page>
  )
}
