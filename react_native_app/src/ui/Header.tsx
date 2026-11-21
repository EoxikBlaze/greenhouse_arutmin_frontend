import { Pressable, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Card } from './Card';
import { Text } from './Text';

export function Header({ title, subtitle, initials, onBell }: { title: string; subtitle: string; initials: string; onBell?: () => void }) {
  return (
    <Card style={{ padding: 16, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text v="wordmark">Vertonik · GARAP</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text v="bodyStrong" style={{ color: colors.accent }}>{initials}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Notifikasi" onPress={onBell}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>
      <Text v="title">{title}</Text>
      <Text v="body">{subtitle}</Text>
    </Card>
  );
}
