import { dark, light, radius, space, shadowCard } from '@/theme/tokens';

test('token mengikuti .pen', () => {
  expect(light.accent).toBe('#1E7A55');
  expect(light.bgScreen).toBe('#B7E2F9');
  expect(radius.card).toBe(20);
  expect(radius.input).toBe(12);
  expect(space.screen).toBe(16);
  expect(shadowCard.shadowColor).toBe('#0B2A1B');
});

test('palet gelap punya semua kunci palet terang', () => {
  expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
});
