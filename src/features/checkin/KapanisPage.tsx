import { useEffect, useState } from 'preact/hooks'
import { db } from '../../db/schema'
import { saveEvening } from '../../db/repo/checkins'
import { todayStr } from '../../logic/dates'
import { navigate } from '../../router'
import { Page } from '../../ui/Page'
import { Button } from '../../ui/Button'

export function KapanisPage() {
  const today = todayStr()
  const [wins, setWins] = useState('')
  const [learned, setLearned] = useState('')
  const [first, setFirst] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    db.checkins.get(today).then(c => {
      if (!alive) return
      setReady(true)
      if (!c) return
      setWins(c.wins ?? '')
      setLearned(c.learned ?? '')
      setFirst(c.tomorrowFirst ?? '')
    })
    return () => { alive = false }
  }, [today])

  const save = async () => {
    await saveEvening(today, { wins: wins.trim(), learned: learned.trim(), tomorrowFirst: first.trim() })
    navigate('#/')
  }

  const field = (label: string, v: string, set: (s: string) => void) => (
    <label class="field">
      <span>{label}</span>
      <textarea disabled={!ready} value={v} onInput={e => set((e.target as HTMLTextAreaElement).value)} />
    </label>
  )

  return (
    <Page title="Gün kapanışı">
      {field('Ne iyi gitti?', wins, setWins)}
      {field('Ne öğrendim?', learned, setLearned)}
      {field('Yarın ilk iş?', first, setFirst)}
      <Button onClick={save} disabled={!ready}>Kaydet</Button>
    </Page>
  )
}
