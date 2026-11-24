import { View } from 'react-native';
import { AlertTriangle, Info, OctagonAlert } from 'lucide-react-native';
import { icon } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Card } from './Card';
import { Text } from './Text';

export function Banner({ tone, title, body }: { tone: 'info' | 'warn' | 'danger'; title: string; body?: string }) {
  const c = useColors();
  const t = {
    info: { bg: c.infoSoft, fg: c.info, Icon: Info },
    warn: { bg: c.warnSoft, fg: c.warn, Icon: AlertTriangle },
    danger: { bg: c.dangerSoft, fg: c.danger, Icon: OctagonAlert },
  }[tone];
  return (
    <Card accessibilityRole="alert" style={{ backgroundColor: t.bg, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <t.Icon size={icon.lg} color={t.fg} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text v="bodyStrong" style={{ color: t.fg }}>{title}</Text>
        {body ? <Text v="meta">{body}</Text> : null}
      </View>
    </Card>
  );
}
