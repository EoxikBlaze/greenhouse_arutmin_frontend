import { ApiClient, ApiError, MemoryStorage } from '@/api/client';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (exp: number) => `${b64({ alg: 'HS256' })}.${b64({ exp })}.sig`;
const now = () => Math.floor(Date.now() / 1000);

function res(status: number, body: unknown) {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}

test('401 membersihkan sesi dan memanggil onUnauthorized', async () => {
  const f = jest.fn(async () => res(401, { message: 'x' }));
  const c = new ApiClient({ baseUrl: 'http://h', fetchFn: f as any, storage: new MemoryStorage() });
  c.setSession(jwt(now() + 9999), { username: 'admin', level: 'admin' });
  const cb = jest.fn();
  c.onUnauthorized = cb;
  await expect(c.get('/x')).rejects.toBeInstanceOf(ApiError);
  expect(cb).toHaveBeenCalled();
  expect(c.token).toBeNull();
});

test('jaringan gagal -> ApiError status null', async () => {
  const f = jest.fn(async () => { throw new Error('net'); });
  const c = new ApiClient({ baseUrl: 'http://h', fetchFn: f as any, storage: new MemoryStorage() });
  await expect(c.get('/x')).rejects.toMatchObject({ status: null, message: expect.stringContaining('tidak terjangkau') });
});

test('restore menolak token yang kedaluwarsa (margin 300 dtk)', async () => {
  const s = new MemoryStorage();
  await s.write(JSON.stringify({ token: jwt(now() + 100), user: { username: 'a', level: 'admin' } }));
  const c = new ApiClient({ baseUrl: 'http://h', fetchFn: jest.fn() as any, storage: s });
  expect(await c.restore()).toBe(false);
  expect(c.token).toBeNull();
});

test('restore menerima token segar', async () => {
  const s = new MemoryStorage();
  await s.write(JSON.stringify({ token: jwt(now() + 9999), user: { username: 'a', level: 'admin' } }));
  const c = new ApiClient({ baseUrl: 'http://h', fetchFn: jest.fn() as any, storage: s });
  expect(await c.restore()).toBe(true);
  expect(c.role).toBe('admin');
});

test('demo menolak POST selain /login tanpa memanggil fetch', async () => {
  const f = jest.fn();
  const c = new ApiClient({ baseUrl: 'http://h', fetchFn: f as any, storage: new MemoryStorage() });
  c.setSession(jwt(now() + 9999), { username: 'demo', level: 'user', is_demo: true });
  expect(c.role).toBe('demo');
  await expect(c.post('/tanam/mulai', {})).rejects.toMatchObject({ status: 403 });
  expect(f).not.toHaveBeenCalled();
});

test('login menyimpan token dan user', async () => {
  const f = jest.fn(async () => res(200, { token: jwt(now() + 9999), user: { username: 'admin', level: 'admin' } }));
  const c = new ApiClient({ baseUrl: 'http://h', fetchFn: f as any, storage: new MemoryStorage() });
  const u = await c.login('admin', 'pw', true);
  expect(u.username).toBe('admin');
  expect(c.isLoggedIn).toBe(true);
});
