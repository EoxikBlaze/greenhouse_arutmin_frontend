import { View } from 'react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Panel } from '@/ui/Panel';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';
import { AdminOnly } from './AdminOnly';

export function SaklarScreen() {
  const c = useColors();
  const { user } = useAuth();
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  return (
    <AdminOnly>
      <Screen>
        <Header back="/alat" title="Pengaturan saklar" subtitle="Admin" initials={initials} />
        <Panel gap={4}>
          <Text v="section">Saklar admin</Text>
          <Text v="body">Perintah hanya dicatat. Tidak ada dosis manual maupun otomatis dari layar ini.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text v="bodyStrong" style={{ fontFamily: fonts.bodySemi }}>Mode semai perangkat</Text>
              <Text v="meta">Status belum dilaporkan server ini.</Text>
            </View>
            <Toggle value={false} disabled label="Mode semai perangkat" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text v="bodyStrong" style={{ color: c.danger, fontFamily: fonts.bodySemi }}>Saklar dosing (informasi status)</Text>
              <Text v="meta" style={{ color: c.danger }}>Layar ini tidak menjalankan dosis apa pun.</Text>
            </View>
            <Toggle value={false} disabled label="Saklar dosing" />
          </View>
        </Panel>
      </Screen>
    </AdminOnly>
  );
}
