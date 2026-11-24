import { useColorScheme } from 'react-native';
import { dark, light, Palette } from './tokens';
import { usePrefs } from './prefs';

// Mode dari pilihan pengguna; "sistem" mengikuti mode terang/gelap perangkat.
export function useColors(): Palette {
  const scheme = useColorScheme();
  const { mode } = usePrefs();
  return (mode === 'system' ? scheme === 'dark' : mode === 'dark') ? dark : light;
}
