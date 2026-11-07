export function FatalError({ error }: { error: unknown }) {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return (
    <main class="page">
      <h1>Jarvis açılamadı</h1>
      <p>Veriler açılamadı. Gizli sekmede olabilirsin ya da tarayıcı depolamayı engelliyor.</p>
      <p class="muted">{text}</p>
    </main>
  )
}
