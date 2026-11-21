import { useQuery } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/api/session';
import { useAuth } from '@/features/auth/AuthProvider';
import { jam, type LatestSensor } from '@/features/beranda/sensorView';
import { colors, radius, shadowDock } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { DataRow } from '@/ui/DataRow';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { AdminOnly } from './AdminOnly';

const card = [shadowDock, { padding: 16, gap: 10 }];

export function AlatScreen() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['latest-sensor'], queryFn: () => api.get<LatestSensor>('/api/latest-sensor'), refetchInterval: 15_000 });
  const lastSeen = q.data?.sensor ? jam(q.data.sensor.created_at) : '—';
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  return (
    <AdminOnly>
      <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
        <Header title="Alat" subtitle="Admin · kendali perangkat" initials={initials} />
        <Card style={card}>
          <Text v="section">Keselamatan</Text>
          <Text v="body">Kondisi tidak diketahui tidak berarti aman. Periksa panel fisik sebelum bekerja di greenhouse.</Text>
          <DataRow label="E-STOP server" value="Tidak diketahui" />
          <DataRow label="E-STOP perangkat" value="Tidak diketahui" />
          <DataRow label="E-STOP fisik" value="Tidak diketahui" />
          <DataRow label="Terakhir terlihat" value={lastSeen} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable accessibilityRole="button" onPress={() => router.navigate('/konfirmasi-perangkat')}
              style={{ flex: 1, height: 48, borderRadius: radius.input, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text v="bodyStrong" style={{ color: colors.danger }}>STOP pompa</Text>
            </Pressable>
            <View accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityHint="E-STOP darurat belum tersedia di server ini. Gunakan E-STOP fisik."
              style={{ flex: 1, height: 48, borderRadius: radius.input, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
              <Text v="bodyStrong" style={{ color: colors.onAccent }}>E-STOP</Text>
            </View>
          </View>
          <Text v="meta" style={{ fontSize: 13, lineHeight: 18 }}>
            Dua aksi terpisah, masing-masing dengan konfirmasi sendiri: STOP pompa dan E-STOP darurat. E-STOP darurat belum tersedia di server ini, gunakan E-STOP fisik. Mode demo tidak mengirim perintah.
          </Text>
        </Card>
        <Card style={[shadowDock, { padding: 16, gap: 8 }]}>
          <Text v="section">Perangkat & mode</Text>
          <DataRow label="Pompa nutrisi" value="—" />
          <DataRow label="Mode semai perangkat" value="—" />
          <DataRow label="Status dosing" value="Terkunci (informasi)" />
          <Text v="meta" style={{ fontSize: 13, lineHeight: 18 }}>Belum ada laporan alat.</Text>
        </Card>
        <Button variant="secondary" label="Buka pengaturan saklar" onPress={() => router.navigate('/saklar')} />
        <Button variant="secondary" label="Lihat kalibrasi" onPress={() => router.navigate('/kalibrasi')} />
        <Button variant="secondary" label="Uji lab" onPress={() => router.navigate('/uji-lab')} />
        <Button variant="secondary" label="Laporan" onPress={() => router.navigate('/laporan')} />
      </Screen>
    </AdminOnly>
  );
}
