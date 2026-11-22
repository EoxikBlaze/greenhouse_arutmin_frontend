import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/api/session';
import { useAuth } from '@/features/auth/AuthProvider';
import { jam, type LatestSensor } from '@/features/beranda/sensorView';
import { radius } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Button } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { DataRow } from '@/ui/DataRow';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Tap } from '@/ui/Tap';
import { Text } from '@/ui/Text';
import { AdminOnly } from './AdminOnly';

export function AlatScreen() {
  const c = useColors();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['latest-sensor'], queryFn: () => api.get<LatestSensor>('/api/latest-sensor'), refetchInterval: 15_000 });
  const lastSeen = q.data?.sensor ? jam(q.data.sensor.created_at) : '—';
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  return (
    <AdminOnly>
      <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
        <Header title="Alat" subtitle="Admin · kendali perangkat" initials={initials} />
        <Panel gap={12}>
          <Text v="section">Keselamatan</Text>
          <Text v="body">Kondisi tidak diketahui tidak berarti aman. Periksa panel fisik sebelum bekerja di greenhouse.</Text>
          <DataRow label="E-STOP server" value="Tidak diketahui" />
          <DataRow label="E-STOP perangkat" value="Tidak diketahui" />
          <DataRow label="E-STOP fisik" value="Tidak diketahui" />
          <DataRow label="Terakhir terlihat" value={lastSeen} last />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Tap accessibilityRole="button" onPress={() => router.navigate('/konfirmasi-perangkat')}
              style={{ flex: 1, minHeight: 48, borderRadius: radius.input, backgroundColor: c.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text v="bodyStrong" style={{ color: c.danger }}>STOP pompa</Text>
            </Tap>
            <View accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityHint="E-STOP darurat belum tersedia di server ini. Gunakan E-STOP fisik."
              style={{ flex: 1, minHeight: 48, borderRadius: radius.input, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
              <Text v="bodyStrong" style={{ color: c.onAccent }}>E-STOP</Text>
            </View>
          </View>
          <Text v="caption">
            Dua aksi terpisah, masing-masing dengan konfirmasi sendiri: STOP pompa dan E-STOP darurat. E-STOP darurat belum tersedia di server ini, gunakan E-STOP fisik. Mode demo tidak mengirim perintah.
          </Text>
        </Panel>
        <Panel gap={8}>
          <Text v="section">Perangkat & mode</Text>
          <DataRow label="Pompa nutrisi" value="—" />
          <DataRow label="Mode semai perangkat" value="—" />
          <DataRow label="Status dosing" value="Terkunci (informasi)" last />
          <Text v="caption">Belum ada laporan alat.</Text>
        </Panel>
        <Button variant="secondary" label="Buka pengaturan saklar" onPress={() => router.navigate('/saklar')} />
        <Button variant="secondary" label="Lihat kalibrasi" onPress={() => router.navigate('/kalibrasi')} />
        <Button variant="secondary" label="Uji lab" onPress={() => router.navigate('/uji-lab')} />
        <Button variant="secondary" label="Laporan" onPress={() => router.navigate('/laporan')} />
      </Screen>
    </AdminOnly>
  );
}
