import { commandStatus, stopPompa, EXPIRE_MS } from '@/features/alat/deviceView';

const T0 = 1_000_000;

test('FORCE_STOP masih tertahan -> Menunggu', () => {
  expect(commandStatus({ command: 'FORCE_STOP', valve_state: 'ON' }, T0, T0 + 5_000)).toBe('menunggu');
});

test('perangkat sudah mengambil perintah (command kembali AUTO) -> Selesai', () => {
  expect(commandStatus({ command: 'AUTO', valve_state: 'OFF' }, T0, T0 + 5_000)).toBe('selesai');
});

test('tertahan lewat batas waktu -> Kedaluwarsa', () => {
  expect(commandStatus({ command: 'FORCE_STOP', valve_state: 'ON' }, T0, T0 + EXPIRE_MS + 1)).toBe('kedaluwarsa');
});

test('status belum terbaca -> Menunggu, bukan Selesai', () => {
  expect(commandStatus(null, T0, T0 + 1_000)).toBe('menunggu');
});

test('command kembali AUTO tapi katup masih ON -> tetap Menunggu (belum terbukti berhenti)', () => {
  expect(commandStatus({ command: 'AUTO', valve_state: 'ON' }, T0, T0 + 1_000)).toBe('menunggu');
});

test('stopPompa: POST /watercontrol/stop', async () => {
  const posts: string[] = [];
  await stopPompa({ get: async () => ({}) as never, post: async (p: string) => { posts.push(p); return {} as never; } });
  expect(posts).toEqual(['/watercontrol/stop']);
});
