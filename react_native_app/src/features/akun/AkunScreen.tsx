import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Info, KeyRound, LogOut, Palette, type LucideIcon } from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, radius, shadowDock } from '@/theme/tokens';
import { Card } from '@/ui/Card';
import { DataRow } from '@/ui/DataRow';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { displayName } from './akunView';

const ROLE_LABEL = { admin: 'Admin', petani: 'Petani', demo: 'Demo' } as const;

function MenuRow({ Icon, label, onPress }: { Icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={{ height: 48, borderRadius: radius.input, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Icon size={22} color={colors.accent} />
      <Text v="body" style={{ flex: 1, color: colors.textPrimary }}>{label}</Text>
      <ChevronRight size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

export function AkunScreen() {
  const { user, role, logout } = useAuth();
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  return (
    <Screen>
      <Header title="Akun" subtitle={`${role ? ROLE_LABEL[role] : ''} · Kebun Vertonik`} initials={initials} />
      <Card style={[shadowDock, { padding: 16, gap: 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text v="title" style={{ fontSize: 24, color: colors.accent }}>{initials}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text v="value" numberOfLines={1}>{displayName(user?.username)}</Text>
            <Text v="body">Level: {user?.level ?? '—'}</Text>
          </View>
        </View>
        <DataRow label="Nama pengguna" value={user?.username ?? '—'} />
        <DataRow label="Email" value={user?.email || '—'} />
      </Card>
      <Card style={[shadowDock, { padding: 16, gap: 4 }]}>
        <MenuRow Icon={KeyRound} label="Ganti kata sandi" onPress={() => router.navigate('/ganti-sandi')} />
        <MenuRow Icon={Palette} label="Tampilan & ukuran teks" onPress={() => router.navigate('/tentang')} />
        <MenuRow Icon={Info} label="Tentang GARAP" onPress={() => router.navigate('/tentang')} />
      </Card>
      <Pressable accessibilityRole="button" onPress={logout}
        style={{ height: 48, borderRadius: radius.input, backgroundColor: colors.dangerSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <LogOut size={20} color={colors.danger} />
        <Text v="bodyStrong" style={{ color: colors.danger }}>Keluar</Text>
      </Pressable>
    </Screen>
  );
}
