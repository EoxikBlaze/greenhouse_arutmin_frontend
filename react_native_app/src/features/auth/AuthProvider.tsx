import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/api/session';
import type { Role, User } from '@/api/client';

interface Auth {
  ready: boolean;
  user: User | null;
  role: Role | null;
  login: (u: string, p: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (u: User) => Promise<void>;
}

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api.onUnauthorized = () => setUser(null);
    api.restore().then((ok) => { if (ok) setUser(api.user); }).finally(() => setReady(true));
  }, []);

  const login = useCallback(async (u: string, p: string, remember: boolean) => {
    setUser(await api.login(u.trim(), p, remember));
  }, []);
  const logout = useCallback(async () => { await api.logout(); setUser(null); }, []);
  const updateUser = useCallback(async (u: User) => { await api.updateUser(u); setUser(u); }, []);

  return <Ctx.Provider value={{ ready, user, role: api.role, login, logout, updateUser }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth di luar AuthProvider');
  return c;
}
