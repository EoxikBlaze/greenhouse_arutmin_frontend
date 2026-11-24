// Model murni pengaturan tampilan (tanpa React/RN) supaya bisa diuji langsung.
export type ThemeMode = 'system' | 'light' | 'dark';
export type TextSize = 'normal' | 'besar' | 'sangat-besar';
export interface Prefs { mode: ThemeMode; textSize: TextSize }

export const TEXT_SCALE: Record<TextSize, number> = { normal: 1, besar: 1.15, 'sangat-besar': 1.3 };
export const DEFAULT_PREFS: Prefs = { mode: 'system', textSize: 'normal' };

const MODES: readonly string[] = ['system', 'light', 'dark'];

// Nilai tersimpan yang rusak atau asing jatuh ke bawaan, bukan melempar galat saat app dibuka.
export function parsePrefs(raw: string | null): Prefs {
  try {
    const o = JSON.parse(raw ?? '');
    return {
      mode: MODES.includes(o?.mode) ? o.mode : DEFAULT_PREFS.mode,
      textSize: typeof o?.textSize === 'string' && Object.prototype.hasOwnProperty.call(TEXT_SCALE, o.textSize) ? o.textSize : DEFAULT_PREFS.textSize,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}
