import { ViewProps } from 'react-native';
import { shadowDock } from '@/theme/tokens';
import { Card } from './Card';

// Kartu isi layar: bayangan dock, padding 16, jarak antar-anak lewat `gap`.
// `soft` memakai bayangan kartu biasa (baris daftar yang bisa ditekan).
export function Panel({ gap = 8, pad = 16, soft = false, style, ...p }: ViewProps & { gap?: number; pad?: number; soft?: boolean }) {
  return <Card {...p} style={[soft ? null : shadowDock, { padding: pad, gap }, style]} />;
}
