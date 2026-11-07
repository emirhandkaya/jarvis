import { reviewTopic } from '../../db/repo/topics'
import type { Rating } from '../../logic/spacedReview'

const RATINGS: [Rating, string][] = [['kolay', 'Kolay'], ['orta', 'Orta'], ['zor', 'Zor']]

export function ReviewChips({ topicId, today }: { topicId: string; today: string }) {
  return (
    <div class="row" style="flex-wrap: wrap">
      {RATINGS.map(([r, label]) => (
        <button key={r} type="button" class="chip" onClick={() => reviewTopic(topicId, r, today)}>{label}</button>
      ))}
    </div>
  )
}
