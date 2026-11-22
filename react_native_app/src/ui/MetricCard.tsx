import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { icon } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Card } from './Card';
import { Text } from './Text';

export type Tone = 'warn' | 'ok' | 'danger';

export function MetricCard({ label, value, unit, status, tone = 'warn', Icon }: {
  label: string; value?: string | null; unit?: string; status: string; tone?: Tone; Icon: LucideIcon;
}) {
  const c = useColors();
  const toneColor: Record<Tone, string> = { warn: c.warn, ok: c.accent, danger: c.danger };
  return (
    <Card style={{ flex: 1, minHeight: 128, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon size={icon.md} color={c.accent} />
        <Text v="label">{label}</Text>
      </View>
      <Text v="value" numberOfLines={1} adjustsFontSizeToFit>
        {value ?? 'Belum ada data'}
        {value && unit ? <Text v="meta">{` ${unit}`}</Text> : null}
      </Text>
      <Text v="status" style={{ color: toneColor[tone] }}>{status}</Text>
    </Card>
  );
}
