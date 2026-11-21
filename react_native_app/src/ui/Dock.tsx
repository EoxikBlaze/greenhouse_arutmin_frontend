import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Home, Sprout, Wrench, TriangleAlert, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadowDock } from '@/theme/tokens';
import { Text } from './Text';

const icons: Record<string, typeof Home> = { index: Home, tanam: Sprout, alat: Wrench, peringatan: TriangleAlert, akun: UserRound };

// Subset props tab bar yang dipakai; tipe penuh tidak diekspor oleh expo-router.
export interface DockProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
}

// Dock melayang: radius 31, padding 6, item aktif = accent-soft radius 24.
// Layar turunan yang tidak punya item dock; tab aktifnya = induk (Sensor/Grafik dari Beranda, layar batch dari Tanam).
const CHILD_OF: Record<string, string> = { sensor: 'index', grafik: 'index', batch: 'tanam', 'mulai-semai': 'tanam', konfirmasi: 'tanam', 'detail-peringatan': 'peringatan', saklar: 'alat', kalibrasi: 'alat', 'konfirmasi-perangkat': 'alat', 'ganti-sandi': 'akun', tentang: 'akun', asisten: 'index' };

export function Dock({ state, descriptors }: DockProps) {
  const { bottom } = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  const activeName = (current && CHILD_OF[current]) ?? current;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingBottom: Math.max(bottom, 14) }}>
      <View style={[{ flexDirection: 'row', gap: 4, padding: 6, height: 62, borderRadius: radius.dock, backgroundColor: colors.surface }, shadowDock]}>
        {state.routes.filter((r) => !(r.name in CHILD_OF)).map((r) => {
          const focused = r.name === activeName;
          const Icon = icons[r.name] ?? Home;
          const label = descriptors[r.key]?.options.title ?? r.name;
          const color = focused ? colors.accent : colors.textSecondary;
          return (
            <Pressable key={r.key} accessibilityRole="tab" accessibilityState={{ selected: focused }}
              onPress={() => router.navigate(r.name === 'index' ? '/' : (`/${r.name}` as '/tanam'))}
              style={{ flex: 1, height: 50, borderRadius: radius.dockItem, gap: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? colors.accentSoft : 'transparent' }}>
              <Icon size={22} color={color} />
              <Text v="label" style={{ fontSize: 11, color }} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
