import { View } from 'react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, fonts, shadowDock } from '@/theme/tokens';
import { Card } from '@/ui/Card';
import { DataRow } from '@/ui/DataRow';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

// Blur dan skala teks belum diterapkan di app ini, jadi ditampilkan sebagai informasi, bukan sakelar palsu.
export function TentangScreen() {
  const { user } = useAuth();
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  return (
    <Screen>
      <Header title="Tentang & tampilan" subtitle="Pengaturan perangkat" initials={initials} />
      <Card style={[shadowDock, { padding: 16, gap: 4 }]}>
        <Text v="section">Tampilan</Text>
        <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text v="body" style={{ flex: 1, color: colors.textPrimary }}>Blur latar belakang</Text>
          <Text v="bodyStrong" style={{ fontFamily: fonts.bodySemi }}>Tidak dipakai</Text>
        </View>
        <DataRow label="Ukuran teks" value="Ikuti sistem" />
      </Card>
      <Card style={[shadowDock, { padding: 16, gap: 8 }]}>
        <Text v="section">Tentang GARAP</Text>
        <Text v="body">GARAP Mobile · Vertonik Smart Farm. Notifikasi hanya muncul di ponsel ini saat aplikasi dibuka.</Text>
      </Card>
    </Screen>
  );
}
