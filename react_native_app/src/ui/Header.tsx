import { useWindowDimensions, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { icon } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Panel } from './Panel';
import { Tap } from './Tap';
import { Text } from './Text';

// back = tujuan induk untuk layar turunan; layar utama tab tidak memakainya.
export function Header({ title, subtitle, initials, onBell, back }: { title: string; subtitle: string; initials: string; onBell?: () => void; back?: Href }) {
  const c = useColors();
  // Layar sempit (< 360): dengan tombol kembali, wordmark disembunyikan agar tidak terpotong.
  const { width } = useWindowDimensions();
  const showBrand = !(back && width < 360);
  const round = { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceSoft, alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <Panel soft>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
          {back ? (
            <Tap accessibilityLabel="Kembali" onPress={() => router.navigate(back)} style={round}>
              <ChevronLeft size={icon.lg} color={c.textPrimary} />
            </Tap>
          ) : null}
          {showBrand ? <Text v="wordmark" numberOfLines={1} style={{ flexShrink: 1 }}>Vertonik · GARAP</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text v="bodyStrong" style={{ color: c.accent }}>{initials}</Text>
          </View>
          <Tap accessibilityLabel="Notifikasi" onPress={onBell ?? (() => router.navigate('/peringatan'))} style={round}>
            <Bell size={icon.lg} color={c.textPrimary} />
          </Tap>
        </View>
      </View>
      <Text v="title">{title}</Text>
      <Text v="body">{subtitle}</Text>
    </Panel>
  );
}
