import { View } from 'react-native';
import { colors } from '@/theme/tokens';
import { Card } from './Card';

const bar = (w: number | `${number}%`, h: number) => ({ width: w, height: h, borderRadius: 8, backgroundColor: colors.surfaceSoft });

// Komponen "Skeleton" .pen: judul 140x18 + dua baris penuh 22.
export function Skeleton({ style }: { style?: object }) {
  return (
    <Card accessibilityLabel="Memuat" style={[{ padding: 16, gap: 12 }, style]}>
      <View style={bar(140, 18)} />
      <View style={bar('100%', 22)} />
      <View style={bar('100%', 22)} />
    </Card>
  );
}
