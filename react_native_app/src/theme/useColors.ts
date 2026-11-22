import { useColorScheme } from 'react-native';
import { dark, light, Palette } from './tokens';

// Mengikuti mode terang/gelap sistem.
export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
