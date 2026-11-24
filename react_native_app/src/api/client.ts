export type Role = 'admin' | 'petani' | 'demo';

export interface User {
  username: string;
  email?: string;
  level: string;
  is_demo?: boolean;
}

export class ApiError extends Error {
  constructor(public status: number | null, message: string) {
    super(message);
  }
}

export interface Storage {
  read(): Promise<string | null>;
  write(v: string | null): Promise<void>;
}

export class MemoryStorage implements Storage {
  private v: string | null = null;
  async read() { return this.v; }
  async write(v: string | null) { this.v = v; }
}

const MSG_UNREACHABLE = 'Sistem tidak terjangkau. Pastikan perangkat terhubung ke jaringan kebun.';
const MSG_DEMO = 'Mode demo: aksi ini hanya bisa dilihat, tidak bisa mengubah data.';
const EXP_MARGIN_S = 300;

export function roleOf(u: User | null): Role | null {
  if (!u) return null;
  if (u.is_demo === true || u.level === 'demo') return 'demo';
  return u.level === 'admin' ? 'admin' : 'petani';
}

function jwtExp(token: string): number | null {
  try {
    const p = token.split('.')[1];
    const json = typeof atob === 'function'
      ? atob(p.replace(/-/g, '+').replace(/_/g, '/'))
      : Buffer.from(p, 'base64url').toString();
    return JSON.parse(json).exp ?? null;
  } catch { return null; }
}

function messageOf(status: number, body: any): string {
  if (status === 401) return 'Anda belum masuk atau sesi sudah berakhir. Silakan login ulang.';
  if (status === 403) return body?.message ? `Akses ditolak. ${body.message}` : 'Akses ditolak.';
  if (status === 404) return 'Data tidak ditemukan (404).';
  if (status === 422) {
    const first = body?.errors ? Object.values(body.errors).flat()[0] : null;
    return String(first ?? body?.message ?? 'Data tidak valid.');
  }
  if (status === 429) return body?.message ?? 'Terlalu banyak percobaan. Coba lagi dalam satu menit.';
  if (status >= 500) return `Sistem sedang sibuk (${status}). Coba lagi nanti.`;
  return body?.message ?? `Permintaan gagal (HTTP ${status}).`;
}

export class ApiClient {
  token: string | null = null;
  user: User | null = null;
  onUnauthorized?: () => void;
  baseUrl: string;
  private fetchFn: typeof fetch;
  private storage: Storage;
  private timeoutMs: number;

  constructor(o: { baseUrl: string; fetchFn?: typeof fetch; storage: Storage; timeoutMs?: number }) {
    this.baseUrl = o.baseUrl.replace(/\/+$/, '');
    // fetch global harus dipanggil tanpa `this` objek lain, kalau tidak browser melempar "Illegal invocation".
    this.fetchFn = o.fetchFn ?? ((input, init) => fetch(input, init));
    this.storage = o.storage;
    this.timeoutMs = o.timeoutMs ?? 10000;
  }

  get isLoggedIn() { return !!this.token; }
  get role() { return roleOf(this.user); }

  setSession(token: string | null, user: User | null) {
    this.token = token;
    this.user = user;
  }

  private async persist(remember: boolean) {
    try {
      await this.storage.write(remember && this.token ? JSON.stringify({ token: this.token, user: this.user }) : null);
    } catch { /* penyimpanan gagal bukan alasan menolak login */ }
  }

  async restore(): Promise<boolean> {
    try {
      const raw = await this.storage.read();
      if (!raw) return false;
      const { token, user } = JSON.parse(raw);
      const exp = jwtExp(token);
      if (!exp || exp < Date.now() / 1000 + EXP_MARGIN_S) {
        await this.storage.write(null);
        return false;
      }
      this.setSession(token, user);
      return true;
    } catch { return false; }
  }

  // Perbarui profil di memori; tersimpan ulang hanya bila sesi memang disimpan ("ingat saya").
  async updateUser(user: User) {
    this.user = user;
    try { if (await this.storage.read()) await this.persist(true); } catch { /* sesi memori tetap benar */ }
  }

  async logout() {
    this.setSession(null, null);
    await this.persist(false);
  }

  private async request<T>(path: string, method: 'GET' | 'POST' | 'PUT', body?: unknown, raw = false): Promise<T> {
    if (method !== 'GET' && this.role === 'demo' && path !== '/login' && path !== '/logout') {
      throw new ApiError(403, MSG_DEMO);
    }
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    let res: Response;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.timeoutMs);
    try {
      res = await this.fetchFn(this.baseUrl + path, {
        method, headers, signal: ctl.signal,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      if (__DEV__) console.warn('[api]', method, path, e);
      throw new ApiError(null, MSG_UNREACHABLE);
    } finally { clearTimeout(timer); }

    // raw: jawaban non-JSON (NDJSON asisten) dibaca sebagai teks; galat tetap diurai sebagai JSON.
    if (raw && res.ok) {
      try { return (await res.text()) as T; } catch { throw new ApiError(null, MSG_UNREACHABLE); }
    }
    let data: any = null;
    try { data = await res.json(); } catch { /* body kosong */ }
    if (res.ok) return data as T;
    if (res.status === 401) {
      await this.logout();
      this.onUnauthorized?.();
    }
    throw new ApiError(res.status, messageOf(res.status, data));
  }

  get<T>(path: string) { return this.request<T>(path, 'GET'); }
  post<T>(path: string, body: unknown) { return this.request<T>(path, 'POST', body); }
  put<T>(path: string, body: unknown) { return this.request<T>(path, 'PUT', body); }
  postText(path: string, body: unknown) { return this.request<string>(path, 'POST', body, true); }

  async login(username: string, password: string, remember: boolean): Promise<User> {
    const r = await this.request<{ token?: string; user?: User }>('/login', 'POST', { username, password, remember });
    if (!r?.token || !r.user) throw new ApiError(null, 'Respons login tidak lengkap.');
    this.setSession(r.token, r.user);
    await this.persist(remember);
    return r.user;
  }
}
