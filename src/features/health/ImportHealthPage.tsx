import { useEffect, useRef, useState } from 'preact/hooks'
import { upsertHealth } from '../../db/repo/health'
import { decodeHealthParam } from '../../logic/healthImport'
import { todayStr } from '../../logic/dates'
import { navigate } from '../../router'
import { Page } from '../../ui/Page'
import { Button } from '../../ui/Button'

type State = { kind: 'work' } | { kind: 'ok'; n: number } | { kind: 'err'; text: string }

export function ImportHealthPage() {
  const [state, setState] = useState<State>({ kind: 'work' })
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return // effect iki kez çalışsa bile tek import
    started.current = true
    const m = /[?&]d=([^&]*)/.exec(location.hash)
    // Veri adres çubuğunda kalmasın: await'ten önce temizle.
    history.replaceState(null, '', location.pathname + location.search + '#/checkin')
    const r = decodeHealthParam(m ? m[1] : '', todayStr())
    if (!r.ok) { setState({ kind: 'err', text: r.error }); return }
    upsertHealth(r.days, 'kisayol').then(
      n => {
        setState({ kind: 'ok', n })
        // replaceState hashchange tetiklemez; yönlendirmeyi elle bildir.
        setTimeout(() => window.dispatchEvent(new HashChangeEvent('hashchange')), 1200)
      },
      () => setState({ kind: 'err', text: 'Veri kaydedilemedi' }),
    )
  }, [])

  return (
    <Page title="Sağlık verisi">
      {state.kind === 'work' && <p class="muted">İçe aktarılıyor…</p>}
      {state.kind === 'ok' && <p class="note" role="status">Sağlık verisi alındı ({state.n} gün)</p>}
      {state.kind === 'err' && (
        <div class="stack">
          <p class="note" role="alert">{state.text}</p>
          <Button onClick={() => navigate('/')}>Bugün'e dön</Button>
        </div>
      )}
    </Page>
  )
}
