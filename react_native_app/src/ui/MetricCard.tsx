import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Card } from './Card';
import { Text } from './Text';

export type Tone = 'warn' | 'ok' | 'danger';
const toneColor: Record<Tone, string> = { warn: colors.warn, ok: colors.accent, danger: colors.danger };

export function MetricCard({ label, value, unit, status, tone = 'warn', Icon }: {
  label: string; value?: string | null; unit?: string; status: string; tone?: Tone; Icon: LucideIcon;
}) {
  return (
    <Card style={{ flex: 1, minHeight: 128, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon size={20} color={colors.accent} />
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
