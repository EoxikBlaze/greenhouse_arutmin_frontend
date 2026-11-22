import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Lock, Timer, TriangleAlert } from 'lucide-react-native';
import { api } from '@/api/session';
import { ApiError } from '@/api/client';
import { useAuth } from '@/features/auth/AuthProvider';
import type { LatestSensor } from '@/features/beranda/sensorView';
import { icon } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { DataRow } from '@/ui/DataRow';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Skeleton } from '@/ui/Skeleton';
import { StatusChip } from '@/ui/StatusChip';
import { Text } from '@/ui/Text';
import { parseParam, sensorDetailView } from './sensorDetailView';

// Kartu S11 memakai bayangan lebih kuat (y6 blur18) daripada kartu Beranda.

export function SensorDetailScreen() {
  const c = useColors();
  const { user, role } = useAuth();
  const param = parseParam(useLocalSearchParams<{ param?: string }>().param);
  const q = useQuery({
    queryKey: ['latest-sensor'],
    queryFn: () => api.get<LatestSensor>('/api/latest-sensor'),
    refetchInterval: 15_000,
  });

  const v = sensorDetailView(q.data, param, role);
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  const subtitle = role === 'demo' ? 'Demo · baca saja' : `Node utama · ${role ?? ''}`;
  const unreachable = q.error instanceof ApiError && q.error.status === null;

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <Header back="/" title="Detail sensor" subtitle={subtitle} initials={initials} />

      {q.isError ? <Banner tone={unreachable ? 'warn' : 'danger'} title={unreachable ? 'HP offline' : 'Gagal memuat sensor'} body={(q.error as Error).message} /> : null}

      {q.isPending && role !== 'demo' ? <Skeleton /> : (
        <Panel gap={8}>
          <Text v="section">{v.title}</Text>
          <Text v="display" style={{ opacity: v.dim ? 0.5 : 1 }} accessibilityLabel={`${v.title} ${v.value}${v.unit ? ` ${v.unit}` : ''}`}>
            {v.value}
            {v.unit && v.state !== 'kosong' ? <Text v="meta">{` ${v.unit}`}</Text> : null}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {v.chip ? (
              <StatusChip label={v.chip.label} tone="warn" Icon={v.chip.label === 'Data basi' ? Timer : TriangleAlert} />
            ) : null}
            <Text v="meta" style={{ flexShrink: 1 }}>{v.meta}</Text>
          </View>
        </Panel>
      )}

      <Button variant="secondary" label="Riwayat & grafik" onPress={() => router.navigate({ pathname: '/grafik', params: { param } })} />

      {v.state === 'anomali' ? <Banner tone="warn" title="Anomali terbaca" body="Nilai ini ditandai di luar rentang wajar. Bukan contoh ambang aman." /> : null}

      <Panel gap={8}>
        <Text v="section">Parameter lain</Text>
        {v.rows.map((r, i) => <DataRow key={r.label} label={r.label} value={r.value} last={i === v.rows.length - 1} />)}
      </Panel>

      <Panel gap={8}>
        <Text v="section">Status dosing otomatis</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Lock size={icon.md} color={c.danger} />
          <Text v="body" style={{ flex: 1 }}>Terkunci · hanya informasi. Dosis tidak dijalankan dari aplikasi.</Text>
        </View>
      </Panel>
    </Screen>
  );
}
