import { validatePassword, validateProfile, displayName } from '@/features/akun/akunView';
import { parseAsisten } from '@/features/asisten/asistenView';

test('validatePassword: lama kosong, baru pendek, tidak sama, valid', () => {
  expect(validatePassword({ lama: '', baru: 'abcdef', ulang: 'abcdef' })).toBe('Isi kata sandi lama.');
  expect(validatePassword({ lama: 'x', baru: 'abc', ulang: 'abc' })).toBe('Kata sandi baru minimal 6 karakter.');
  expect(validatePassword({ lama: 'x', baru: 'abcdef', ulang: 'abcdeg' })).toBe('Kata sandi baru tidak sama.');
  expect(validatePassword({ lama: 'x', baru: 'abcdef', ulang: 'abcdef' })).toBeNull();
});

test('displayName: username dirapikan, kosong -> Pengguna', () => {
  expect(displayName('admin_vertonik')).toBe('Admin Vertonik');
  expect(displayName('demo')).toBe('Demo');
  expect(displayName(undefined)).toBe('Pengguna');
});

test('parseAsisten: NDJSON memakai baris selesai', () => {
  const raw = ['{"tipe":"kalimat","teks":"Halo."}', 'bukan json', '{"tipe":"selesai","jawaban":"Panen sekitar 3 minggu.","saran_pertanyaan":["Bagaimana pH?"," "]}'].join('\n');
  expect(parseAsisten(raw)).toEqual({ jawaban: 'Panen sekitar 3 minggu.', saran: ['Bagaimana pH?'] });
});

test('parseAsisten: JSON biasa {jawaban}', () => {
  expect(parseAsisten('{"jawaban":"Ok"}')).toEqual({ jawaban: 'Ok', saran: [] });
});

test('parseAsisten: terputus (tanpa selesai) atau kosong -> galat', () => {
  expect(() => parseAsisten('{"tipe":"kalimat","teks":"x"}')).toThrow('terputus');
  expect(() => parseAsisten('')).toThrow('tidak dapat dibaca');
  expect(() => parseAsisten('{"jawaban":"  "}')).toThrow();
});

test('validateProfile: username pendek, email salah, email kosong boleh, valid', () => {
  expect(validateProfile({ username: 'ab', email: '' })).toBe('Nama pengguna minimal 3 karakter.');
  expect(validateProfile({ username: 'abc', email: 'bukan-email' })).toBe('Format email tidak valid.');
  expect(validateProfile({ username: 'abc', email: '' })).toBeNull();
  expect(validateProfile({ username: ' abc ', email: 'a@b.co' })).toBeNull();
});
