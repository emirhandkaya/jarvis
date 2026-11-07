import { Page } from '../../ui/Page'

export function ComingSoon({ name }: { name: string }) {
  return (
    <Page title={name}>
      <p class="muted">Bu ekran yakında geliyor.</p>
    </Page>
  )
}
