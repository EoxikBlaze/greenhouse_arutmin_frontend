import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { DEFAULT_PREFS, parsePrefs, Prefs, TEXT_SCALE, TextSize, ThemeMode } from './prefsModel';

// Pengaturan tampilan yang bisa diubah pengguna; disimpan di perangkat ini saja.
export type { TextSize, ThemeMode } from './prefsModel';

const KEY = 'garap.tampilan';
// SecureStore tidak ada di web; localStorage dipakai hanya untuk pratinjau dev di browser.
async function read(): Promise<string | null> {
  try {
    return Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) ?? null : await SecureStore.getItemAsync(KEY);
  } catch { return null; }
}
async function write(v: string): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, v); else await SecureStore.setItemAsync(KEY, v);
  } catch { /* gagal menyimpan: pilihan tetap berlaku sampai app ditutup */ }
}

interface Ctx extends Prefs { scale: number; setMode: (m: ThemeMode) => void; setTextSize: (s: TextSize) => void }
const noop = () => {};
const PrefsCtx = createContext<Ctx>({ ...DEFAULT_PREFS, scale: 1, setMode: noop, setTextSize: noop });

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);
  useEffect(() => { read().then((raw) => setPrefs(parsePrefs(raw))).finally(() => setReady(true)); }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => { const next = { ...p, ...patch }; void write(JSON.stringify(next)); return next; });
  }, []);
  const value = useMemo<Ctx>(() => ({
    ...prefs,
    scale: TEXT_SCALE[prefs.textSize],
    setMode: (mode) => update({ mode }),
    setTextSize: (textSize) => update({ textSize }),
  }), [prefs, update]);

  // Tahan render sampai pilihan terbaca supaya tema tidak berkedip dari sistem ke pilihan.
  if (!ready) return null;
  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

export const usePrefs = () => useContext(PrefsCtx);
