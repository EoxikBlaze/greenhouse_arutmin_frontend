import { View } from 'react-native';
import { radius } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Card } from './Card';

// Komponen "Skeleton" .pen: judul 140x18 + dua baris penuh 22.
export function Skeleton({ style }: { style?: object }) {
  const c = useColors();
  const bar = (w: number | `${number}%`, h: number) => ({ width: w, height: h, borderRadius: radius.sm, backgroundColor: c.surfaceSoft });
  return (
    <Card accessibilityLabel="Memuat" style={[{ padding: 16, gap: 12 }, style]}>
      <View style={bar(140, 18)} />
      <View style={bar('100%', 22)} />
      <View style={bar('100%', 22)} />
    </Card>
  );
}
