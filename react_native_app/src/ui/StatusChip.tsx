import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { fonts, icon, radius } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Text } from './Text';

// "Chip" status .pen: pil 999, ikon 16, teks 14 tebal.
export function StatusChip({ label, tone, Icon }: { label: string; tone: 'warn' | 'info' | 'ok' | 'danger'; Icon: LucideIcon }) {
  const c = useColors();
  const t = {
    warn: { fg: c.warn, bg: c.warnSoft },
    info: { fg: c.info, bg: c.infoSoft },
    ok: { fg: c.accent, bg: c.accentSoft },
    danger: { fg: c.danger, bg: c.dangerSoft },
  }[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.bg, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 12 }}>
      <Icon size={icon.sm} color={t.fg} />
      <Text v="label" style={{ color: t.fg, fontFamily: fonts.bodyBold }}>{label}</Text>
    </View>
  );
}
