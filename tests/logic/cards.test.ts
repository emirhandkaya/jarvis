import { orderCards } from '../../src/logic/cards'

test('orderCards sıra, yeni kart ve gizleme', () => {
  expect(orderCards(['a','b','c','d'], ['c','a'], ['b'])).toEqual(['c','a','d'])
  expect(orderCards(['a'], ['silinmis','a'], [])).toEqual(['a'])
})
