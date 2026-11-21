import { ReactNode } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '@/theme/tokens';

// Kerangka layar tab: latar bg-screen, padding 16, ruang untuk dock melayang di bawah.
export function Screen({ children, onRefresh, refreshing = false }: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  const { top } = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgScreen }}
      contentContainerStyle={{ paddingTop: top + 12, paddingHorizontal: space.screen, paddingBottom: 130, gap: space.gap }}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}
