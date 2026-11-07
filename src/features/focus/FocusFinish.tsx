import { useEffect, useState } from 'preact/hooks'
import type { ActiveTimer } from '../../logic/timer'
import type { Rating } from '../../logic/spacedReview'
import { finishTimer } from '../../db/repo/focus'
import { useTopics } from '../../db/repo/topics'
import { navigate } from '../../router'
import { Button } from '../../ui/Button'

const RATINGS: [Rating, string][] = [['kolay', 'Kolay'], ['orta', 'Orta'], ['zor', 'Zor']]

interface Props { timer: ActiveTimer | null; onBack: () => void }

export function FocusFinish({ timer, onBack }: Props) {
  const [courseId] = useState(() => timer?.courseId)
  const [studied] = useState(() => [...new Set(timer?.topicIds ?? [])])
  const topics = useTopics(courseId)
  const [recall, setRecall] = useState(['', '', ''])
  const [ratings, setRatings] = useState<Record<string, Rating>>({})
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    if (result === null) return
    const id = setTimeout(() => navigate('/'), 1500)
    return () => clearTimeout(id)
  }, [result])

  const save = async (skip: boolean) => {
    const s = await finishTimer(new Date(), skip ? { recall: [], ratings: {} } : { recall, ratings })
    setResult(s ? `${s.minutes} dk kaydedildi` : '1 dakikadan kısa, kaydedilmedi.')
  }

  if (result !== null) return <div class="stack"><p class="note">{result}</p></div>

  return (
    <div class="stack">
      <h2 style="margin: 0">Ne hatırlıyorum?</h2>
      {recall.map((v, i) => (
        <input key={i} type="text" enterkeyhint="next" placeholder={`${i + 1}.`} value={v}
          onInput={e => { const val = (e.target as HTMLInputElement).value; setRecall(r => r.map((x, j) => j === i ? val : x)) }} />
      ))}
      {studied.map(id => (
        <div key={id}>
          <div>{topics?.find(t => t.id === id)?.name ?? 'Konu'}</div>
          <div class="row">
            {RATINGS.map(([r, label]) => (
              <button key={r} type="button" class={`chip${ratings[id] === r ? ' on' : ''}`}
                onClick={() => setRatings(cur => ({ ...cur, [id]: r }))}>{label}</button>
            ))}
          </div>
        </div>
      ))}
      <div class="row">
        <Button class="grow" onClick={() => save(false)}>Kaydet</Button>
        <Button variant="ghost" class="grow" onClick={() => save(true)}>Atla</Button>
      </div>
      <Button variant="ghost" onClick={onBack}>Geri dön</Button>
    </div>
  )
}
