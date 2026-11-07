import { parseHash } from '../../src/router'

test('temel rotalar', () => {
  expect(parseHash('#/').name).toBe('bugun')
  expect(parseHash('#/gorevler').name).toBe('gorevler')
  expect(parseHash('#/menu').name).toBe('menu')
})
test('parametre ve query', () => {
  const r = parseHash('#/ders/abc')
  expect(r.name).toBe('dersDetay'); expect(r.params.id).toBe('abc')
  expect(parseHash('#/import-health?d=xyz').query.get('d')).toBe('xyz')
})
test("bilinmeyen/boş rota Bugün'e düşer", () => {
  for (const h of ['', '#', '#/xyz', '#/ders/a/b']) expect(parseHash(h).name).toBe('bugun')
})
