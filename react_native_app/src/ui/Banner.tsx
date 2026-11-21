import { View } from 'react-native';
import { AlertTriangle, Info, OctagonAlert } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Card } from './Card';
import { Text } from './Text';

const tones = {
  info: { bg: colors.infoSoft, fg: colors.info, Icon: Info },
  warn: { bg: colors.warnSoft, fg: colors.warn, Icon: AlertTriangle },
  danger: { bg: colors.dangerSoft, fg: colors.danger, Icon: OctagonAlert },
};

export function Banner({ tone, title, body }: { tone: keyof typeof tones; title: string; body?: string }) {
  const t = tones[tone];
  return (
    <Card accessibilityRole="alert" style={{ backgroundColor: t.bg, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <t.Icon size={22} color={t.fg} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text v="bodyStrong" style={{ color: t.fg }}>{title}</Text>
        {body ? <Text v="meta">{body}</Text> : null}
      </View>
    </Card>
  );
}
