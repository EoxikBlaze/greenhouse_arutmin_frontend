import { View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Info, KeyRound, LogOut, Palette, type LucideIcon } from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { radius, icon } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Panel } from '@/ui/Panel';
import { DataRow } from '@/ui/DataRow';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Tap } from '@/ui/Tap';
import { Text } from '@/ui/Text';
import { displayName } from './akunView';

const ROLE_LABEL = { admin: 'Admin', petani: 'Petani', demo: 'Demo' } as const;

function MenuRow({ Icon, label, onPress }: { Icon: LucideIcon; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Tap accessibilityRole="button" onPress={onPress}
      style={{ minHeight: 48, borderRadius: radius.input, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Icon size={icon.lg} color={c.accent} />
      <Text v="body" style={{ flex: 1, color: c.textPrimary }}>{label}</Text>
      <ChevronRight size={icon.md} color={c.textSecondary} />
    </Tap>
  );
}

export function AkunScreen() {
  const c = useColors();
  const { user, role, logout } = useAuth();
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  return (
    <Screen>
      <Header title="Akun" subtitle={`${role ? ROLE_LABEL[role] : ''} · Kebun Vertonik`} initials={initials} />
      <Panel gap={12}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text v="value" style={{ color: c.accent }}>{initials}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text v="value" numberOfLines={1}>{displayName(user?.username)}</Text>
            <Text v="body">Level: {user?.level ?? '—'}</Text>
          </View>
        </View>
        <DataRow label="Nama pengguna" value={user?.username ?? '—'} />
        <DataRow label="Email" value={user?.email || '—'} last />
      </Panel>
      <Panel gap={4}>
        <MenuRow Icon={KeyRound} label="Ganti kata sandi" onPress={() => router.navigate('/ganti-sandi')} />
        <MenuRow Icon={Palette} label="Tampilan & ukuran teks" onPress={() => router.navigate('/tentang')} />
        <MenuRow Icon={Info} label="Tentang GARAP" onPress={() => router.navigate('/tentang')} />
      </Panel>
      <Tap accessibilityRole="button" onPress={logout}
        style={{ minHeight: 48, borderRadius: radius.input, backgroundColor: c.dangerSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <LogOut size={icon.md} color={c.danger} />
        <Text v="bodyStrong" style={{ color: c.danger }}>Keluar</Text>
      </Tap>
    </Screen>
  );
}
