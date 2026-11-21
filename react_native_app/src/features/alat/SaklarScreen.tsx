import { View } from 'react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, fonts, shadowDock } from '@/theme/tokens';
import { Card } from '@/ui/Card';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { AdminOnly } from './AdminOnly';

// Rel saklar .pen 52x32. Hanya tampilan: server ini belum melaporkan atau menerima status saklar ini.
function Rail({ on }: { on: boolean }) {
  return (
    <View accessibilityRole="switch" accessibilityState={{ checked: on, disabled: true }}
      style={{ width: 52, height: 32, borderRadius: 16, padding: 4, justifyContent: 'center', alignItems: on ? 'flex-end' : 'flex-start', backgroundColor: on ? colors.accent : colors.border, opacity: 0.6 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' }} />
    </View>
  );
}

export function SaklarScreen() {
  const { user } = useAuth();
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  return (
    <AdminOnly>
      <Screen>
        <Header title="Pengaturan saklar" subtitle="Admin" initials={initials} />
        <Card style={[shadowDock, { padding: 16, gap: 4 }]}>
          <Text v="section">Saklar admin</Text>
          <Text v="body">Perintah hanya dicatat. Tidak ada dosis manual maupun otomatis dari layar ini.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text v="bodyStrong" style={{ fontFamily: fonts.bodySemi }}>Mode semai perangkat</Text>
              <Text v="meta">Status belum dilaporkan server ini.</Text>
            </View>
            <Rail on={false} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text v="bodyStrong" style={{ color: colors.danger, fontFamily: fonts.bodySemi }}>Saklar dosing (informasi status)</Text>
              <Text v="meta" style={{ color: colors.danger }}>Layar ini tidak menjalankan dosis apa pun.</Text>
            </View>
            <Rail on={false} />
          </View>
        </Card>
      </Screen>
    </AdminOnly>
  );
}
