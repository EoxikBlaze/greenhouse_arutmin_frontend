import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Droplets, FlaskConical, Sprout, Thermometer, TriangleAlert, Video, Wind, ChevronRight } from 'lucide-react-native';
import { api } from '@/api/session';
import { ApiError } from '@/api/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors } from '@/theme/tokens';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Header } from '@/ui/Header';
import { MetricCard } from '@/ui/MetricCard';
import { Screen } from '@/ui/Screen';
import { SectionTitle } from '@/ui/SectionTitle';
import { Text } from '@/ui/Text';
import { LatestSensor, sensorView } from './sensorView';
import { Pressable } from 'react-native';

const ICONS = { ph: FlaskConical, tds: Droplets, waterTemp: Thermometer, airTemp: Wind } as const;
const ROLE_LABEL = { admin: 'Admin', petani: 'Petani', demo: 'Mode demo' } as const;

export function BerandaScreen() {
  const { user, role } = useAuth();
  const q = useQuery({
    queryKey: ['latest-sensor'],
    queryFn: () => api.get<LatestSensor>('/api/latest-sensor'),
    refetchInterval: 15_000,
  });

  const view = q.data ? sensorView(q.data) : null;
  const phoneOffline = q.error instanceof ApiError && q.error.status === null;
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <Header title="Beranda" subtitle={`${role ? ROLE_LABEL[role] : ''} · Kebun Vertonik`} initials={initials} />

      {/* Prioritas banner: HP offline > perangkat offline > mode demo */}
      {phoneOffline ? <Banner tone="warn" title="HP offline" body="Tidak ada koneksi ke server. Tarik layar ke bawah untuk mencoba lagi." />
        : view?.offline ? <Banner tone="warn" title="Data sensor basi" body={view.lastAt ? `Terakhir diperbarui pukul ${view.lastAt}` : 'Perangkat belum mengirim data.'} />
        : role === 'demo' ? <Banner tone="info" title="Mode Demo" body="Data contoh, semua aksi baca saja." /> : null}

      <SectionTitle title="Sensor" />
      {q.isError && !phoneOffline ? <Banner tone="danger" title="Gagal memuat sensor" body={(q.error as Error).message} /> : null}
      {[0, 2].map((i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
          {(view?.metrics ?? DEFAULT_METRICS).slice(i, i + 2).map((m) => (
            <Pressable key={m.key} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`Detail ${m.label}`}
              onPress={() => router.navigate({ pathname: '/sensor', params: { param: m.key } })}>
              <MetricCard label={m.label} value={m.value} unit={m.unit} status={q.isPending ? 'Memuat…' : m.status} tone={m.tone} Icon={ICONS[m.key]} />
            </Pressable>
          ))}
        </View>
      ))}
      {view?.lastAt && !view.offline ? <Text v="meta">Terakhir {view.lastAt}</Text> : !view ? <Text v="meta">Belum ada data dari perangkat.</Text> : null}

      <SectionTitle title="Peringatan terbaru" action="Lihat semua" onAction={() => router.navigate('/peringatan')} />
      {view && view.alerts.length ? (
        <Card style={{ padding: 0 }}>
          {view.alerts.map((a, i) => (
            <View key={a.sensor} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
              <TriangleAlert size={22} color={colors.warn} />
              <View style={{ flex: 1 }}>
                <Text v="bodyStrong">{a.sensor.toUpperCase()} di luar ambang</Text>
                <Text v="meta">{`Nilai ${a.value} (batas ${a.min}–${a.max})`}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : <EmptyState title="Tidak ada peringatan" body="Semua pembacaan sensor masih dalam ambang." />}

      <SectionTitle title="Kegiatan tanam" />
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/tanam')}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Sprout size={22} color={colors.accent} />
          <Text v="bodyStrong" style={{ flex: 1 }}>Lihat batch tanam</Text>
          <ChevronRight size={20} color={colors.textPrimary} />
        </Card>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/cctv')}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Video size={22} color={colors.accent} />
          <Text v="bodyStrong" style={{ flex: 1 }}>Lihat kamera kebun (CCTV)</Text>
          <ChevronRight size={20} color={colors.textPrimary} />
        </Card>
      </Pressable>
      <Button variant="secondary" label="Tanya Asisten GARAP" onPress={() => router.navigate('/asisten')} />
    </Screen>
  );
}

const DEFAULT_METRICS = sensorView({ is_online: false, seconds_ago: null, anomalies: [], sensor: null }).metrics;
