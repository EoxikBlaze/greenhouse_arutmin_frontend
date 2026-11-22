import { ReactElement, ReactNode } from 'react';
import { FlatList, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';

type Refresh = { onRefresh?: () => void; refreshing?: boolean };

// Gaya bersama: latar bg-screen, padding 16, ruang untuk dock melayang di bawah.
// maxWidth menjaga tablet/lanskap tidak menarik tata letak ponsel selebar layar.
function useChrome({ onRefresh, refreshing = false }: Refresh) {
  const c = useColors();
  const { top } = useSafeAreaInsets();
  return {
    style: { flex: 1, backgroundColor: c.bgScreen },
    contentContainerStyle: { paddingTop: top + 12, paddingHorizontal: space.screen, paddingBottom: 130, gap: space.gap, width: '100%', maxWidth: 600, alignSelf: 'center' } as const,
    keyboardShouldPersistTaps: 'handled' as const,
    automaticallyAdjustKeyboardInsets: true,
    refreshControl: onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} /> : undefined,
  };
}

// Kerangka layar tab.
export function Screen({ children, ...refresh }: Refresh & { children: ReactNode }) {
  return <ScrollView {...useChrome(refresh)}>{children}</ScrollView>;
}

// Kerangka yang sama untuk daftar yang bisa panjang: baris dirender malas lewat FlatList.
export function ScreenList<T>({ data, renderItem, keyExtractor, header, footer, ...refresh }: Refresh & {
  data: readonly T[]; renderItem: (item: T) => ReactElement; keyExtractor: (item: T) => string; header?: ReactElement; footer?: ReactElement;
}) {
  return (
    <FlatList
      {...useChrome(refresh)}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderItem(item)}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
    />
  );
}
