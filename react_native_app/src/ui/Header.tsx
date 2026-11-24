import { useWindowDimensions, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { usePrefs } from '@/theme/prefs';
import { icon } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Panel } from './Panel';
import { Tap } from './Tap';
import { Text } from './Text';

// Satu baris ringkas: [kembali] judul + keterangan, avatar, notifikasi. Tanpa wordmark di atas judul:
// merek sudah dibawa foto latar dan dock. back = tujuan induk untuk layar turunan.
export function Header({ title, subtitle, initials, onBell, back }: { title: string; subtitle: string; initials: string; onBell?: () => void; back?: Href }) {
  const c = useColors();
  // Avatar hanya hiasan: disembunyikan di layar sempit (< 360) dan di layar turunan (ada tombol kembali) supaya judul punya ruang.
  const { width } = useWindowDimensions();
  const showAvatar = width >= 360 && !back;
  const { scale } = usePrefs();
  const round = { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceSoft, alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <Panel pad={12} gap={0}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {back ? (
          <Tap accessibilityLabel="Kembali" onPress={() => router.navigate(back)} style={round}>
            <ChevronLeft size={icon.lg} color={c.textPrimary} />
          </Tap>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text v="title" numberOfLines={showAvatar && scale === 1 ? 1 : 2} adjustsFontSizeToFit minimumFontScale={0.75} accessibilityRole="header">{title}</Text>
          <Text v="meta" numberOfLines={1}>{subtitle}</Text>
        </View>
        {showAvatar ? (
          <View accessible={false} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text v="bodyStrong" style={{ color: c.accent }}>{initials}</Text>
          </View>
        ) : null}
        <Tap accessibilityLabel="Notifikasi" onPress={onBell ?? (() => router.navigate('/peringatan'))} style={round}>
          <Bell size={icon.lg} color={c.textPrimary} />
        </Tap>
      </View>
    </Panel>
  );
}
