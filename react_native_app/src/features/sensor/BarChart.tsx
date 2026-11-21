import { View } from 'react-native';
import { colors } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import type { Bar } from './chartView';

const AREA = 180;
const BAR_MIN = 24;
const BAR_MAX = 140;

// "Area Grafik" .pen: kolom sama lebar, batang radius 8 warna accent, label 11 di bawah.
export function BarChart({ bars, summary }: { bars: Bar[]; summary: string }) {
  return (
    <View accessible accessibilityLabel={summary} style={{ height: AREA, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
      {bars.map((b) => (
        <View key={b.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
          {b.height == null ? null : (
            <View style={{ alignSelf: 'stretch', borderRadius: 8, backgroundColor: colors.accent, height: BAR_MIN + b.height * (BAR_MAX - BAR_MIN) }} />
          )}
          <Text v="meta" style={{ fontSize: 11 }}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
}
