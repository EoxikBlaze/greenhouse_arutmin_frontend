import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Text } from './Text';

const tones = {
  warn: { fg: colors.warn, bg: colors.warnSoft },
  info: { fg: colors.info, bg: colors.infoSoft },
  ok: { fg: colors.accent, bg: colors.accentSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
};

// "Chip" status .pen: pil 999, ikon 16, teks 14 tebal.
export function StatusChip({ label, tone, Icon }: { label: string; tone: keyof typeof tones; Icon: LucideIcon }) {
  const t = tones[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.bg, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
      <Icon size={16} color={t.fg} />
      <Text v="label" style={{ color: t.fg, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}
