import { ViewProps } from 'react-native';
import { Card } from './Card';

// Kartu isi layar: padding 16, jarak antar-anak lewat `gap`.
export function Panel({ gap = 8, pad = 16, style, ...p }: ViewProps & { gap?: number; pad?: number }) {
  return <Card {...p} style={[{ padding: pad, gap }, style]} />;
}
