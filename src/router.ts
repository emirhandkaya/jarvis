import { useEffect, useState } from 'preact/hooks'

export type RouteName =
  | 'bugun' | 'checkin' | 'kapanis' | 'plan' | 'odak' | 'ders' | 'dersDetay'
  | 'spor' | 'sporYeni' | 'aliskanlik' | 'gorevler' | 'hedefler' | 'istatistik'
  | 'degerlendirme' | 'ayarlar' | 'importHealth' | 'menu'

export interface Route {
  name: RouteName
  params: Record<string, string>
  query: URLSearchParams
}

const ROUTES: [string, RouteName][] = [
  ['/', 'bugun'],
  ['/checkin', 'checkin'],
  ['/kapanis', 'kapanis'],
  ['/plan', 'plan'],
  ['/odak', 'odak'],
  ['/ders', 'ders'],
  ['/ders/:id', 'dersDetay'],
  ['/spor', 'spor'],
  ['/spor/yeni', 'sporYeni'],
  ['/aliskanlik', 'aliskanlik'],
  ['/gorevler', 'gorevler'],
  ['/hedefler', 'hedefler'],
  ['/istatistik', 'istatistik'],
  ['/degerlendirme', 'degerlendirme'],
  ['/ayarlar', 'ayarlar'],
  ['/import-health', 'importHealth'],
  ['/menu', 'menu'],
]

export function parseHash(hash: string): Route {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const [pathPart, queryPart = ''] = raw.split('?')
  const query = new URLSearchParams(queryPart)
  const segs = pathPart.split('/').filter(Boolean)
  for (const [pattern, name] of ROUTES) {
    const pSegs = pattern.split('/').filter(Boolean)
    if (pSegs.length !== segs.length) continue
    const params: Record<string, string> = {}
    let ok = true
    pSegs.forEach((p, i) => {
      if (p.startsWith(':')) {
        try { params[p.slice(1)] = decodeURIComponent(segs[i]) } catch { ok = false }
      } else if (p !== segs[i]) ok = false
    })
    if (ok) return { name, params, query }
  }
  return { name: 'bugun', params: {}, query }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash))
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export function navigate(path: string): void {
  location.hash = path
}
