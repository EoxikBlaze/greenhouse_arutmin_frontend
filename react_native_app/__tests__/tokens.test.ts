import { colors, radius, space, shadowCard } from '@/theme/tokens';

test('token mengikuti .pen', () => {
  expect(colors.accent).toBe('#1E7A55');
  expect(colors.bgScreen).toBe('#B7E2F9');
  expect(radius.card).toBe(20);
  expect(radius.input).toBe(12);
  expect(space.screen).toBe(16);
  expect(shadowCard.shadowColor).toBe('#0B2A1B');
});
