import { DEFAULT_PREFS, parsePrefs, TEXT_SCALE } from '@/theme/prefsModel';

test('tanpa data tersimpan -> bawaan', () => {
  expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
});

test('pilihan valid dibaca apa adanya', () => {
  expect(parsePrefs('{"mode":"dark","textSize":"besar"}')).toEqual({ mode: 'dark', textSize: 'besar' });
});

test('data rusak atau asing jatuh ke bawaan per kunci', () => {
  expect(parsePrefs('bukan json')).toEqual(DEFAULT_PREFS);
  expect(parsePrefs('{"mode":"neon","textSize":"raksasa"}')).toEqual(DEFAULT_PREFS);
  expect(parsePrefs('{"mode":"light","textSize":"__proto__"}')).toEqual({ mode: 'light', textSize: 'normal' });
});

test('skala teks naik bertahap', () => {
  expect(TEXT_SCALE.normal).toBe(1);
  expect(TEXT_SCALE.besar).toBeGreaterThan(1);
  expect(TEXT_SCALE['sangat-besar']).toBeGreaterThan(TEXT_SCALE.besar);
});
