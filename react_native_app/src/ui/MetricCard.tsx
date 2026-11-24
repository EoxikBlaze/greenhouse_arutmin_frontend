import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { icon } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Card } from './Card';
import { rangeLayout } from '@/features/beranda/sensorView';
import { Text } from './Text';

export type Tone = 'warn' | 'ok' | 'danger';

export function MetricCard({ label, value, unit, status, tone = 'warn', Icon, stale = false, range }: {
  label: string; value?: string | null; unit?: string; status: string; tone?: Tone; Icon: LucideIcon;
  stale?: boolean; range?: { min: number; max: number; value: number };
}) {
  const c = useColors();
  const toneColor: Record<Tone, string> = { warn: c.warn, ok: c.accent, danger: c.danger };
  return (
    <Card style={{ flex: 1, minHeight: stale ? 96 : 128, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon size={icon.md} color={c.accent} />
        <Text v="label">{label}</Text>
      </View>
      <Text v="value" numberOfLines={1} adjustsFontSizeToFit style={stale ? { opacity: 0.55 } : undefined}>
        {value ?? 'Belum ada data'}
        {value && unit ? <Text v="meta">{` ${unit}`}</Text> : null}
      </Text>
      {stale ? null : <Text v="status" style={{ color: toneColor[tone] }}>{status}</Text>}
      {range ? <RangeBar range={range} color={toneColor[tone]} /> : null}
    </Card>
  );
}

// Pita batas: trek, pita hijau untuk rentang aman, penanda untuk nilai sekarang.
function RangeBar({ range, color }: { range: { min: number; max: number; value: number }; color: string }) {
  const c = useColors();
  const l = rangeLayout(range);
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ gap: 4 }}>
      <View style={{ height: 12, justifyContent: 'center' }}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: c.border }} />
        <View style={{ position: 'absolute', height: 4, borderRadius: 2, backgroundColor: c.accent, left: `${l.bandStart * 100}%`, width: `${(l.bandEnd - l.bandStart) * 100}%` }} />
        <View style={{ position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: color, borderWidth: 2, borderColor: c.surface, left: `${l.marker * 100}%`, marginLeft: -6 }} />
      </View>
      <Text v="caption">{`Batas ${range.min}–${range.max}`}</Text>
    </View>
  );
}
