import { Pressable, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Home, Sprout, Wrench, TriangleAlert, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, shadowDock, icon } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Text } from './Text';

const icons: Record<string, typeof Home> = { index: Home, tanam: Sprout, alat: Wrench, peringatan: TriangleAlert, akun: UserRound };

// Subset props tab bar yang dipakai; tipe penuh tidak diekspor oleh expo-router.
export interface DockProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
}

// Dock melayang: radius 31, padding 6, item aktif = accent-soft radius 24.
// Layar turunan yang tidak punya item dock; tab aktifnya = induk (Sensor/Grafik dari Beranda, layar batch dari Tanam).
const CHILD_OF: Record<string, string> = { sensor: 'index', grafik: 'index', batch: 'tanam', 'mulai-semai': 'tanam', konfirmasi: 'tanam', 'detail-peringatan': 'peringatan', saklar: 'alat', kalibrasi: 'alat', 'konfirmasi-perangkat': 'alat', 'ganti-sandi': 'akun', 'ubah-profil': 'akun', 'naik-harian': 'tanam', kurva: 'tanam', tentang: 'akun', asisten: 'index', 'analisis-harian': 'index', 'uji-lab': 'alat', laporan: 'alat', cctv: 'index' };

export function Dock({ state, descriptors }: DockProps) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  const activeName = (current && CHILD_OF[current]) ?? current;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: width < 360 ? 8 : 12, paddingBottom: Math.max(bottom, 14) }}>
      <View style={[{ flexDirection: 'row', gap: width < 360 ? 0 : 4, padding: width < 360 ? 4 : 6, height: 62, borderRadius: radius.dock, backgroundColor: c.surface }, shadowDock]}>
        {state.routes.filter((r) => !(r.name in CHILD_OF)).map((r) => {
          const focused = r.name === activeName;
          const Icon = icons[r.name] ?? Home;
          const label = descriptors[r.key]?.options.title ?? r.name;
          const color = focused ? c.accent : c.textSecondary;
          return (
            <Pressable key={r.key} accessibilityRole="tab" accessibilityState={{ selected: focused }}
              onPress={() => router.navigate(r.name === 'index' ? '/' : (`/${r.name}` as '/tanam'))}
              style={{ flex: 1, height: 50, borderRadius: radius.dockItem, gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? c.accentSoft : 'transparent' }}>
              <Icon size={icon.lg} color={color} />
              <Text v="tab" style={{ color }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
