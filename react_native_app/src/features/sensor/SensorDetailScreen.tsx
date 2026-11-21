import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Lock, Timer, TriangleAlert } from 'lucide-react-native';
import { api } from '@/api/session';
import { ApiError } from '@/api/client';
import { useAuth } from '@/features/auth/AuthProvider';
import type { LatestSensor } from '@/features/beranda/sensorView';
import { colors, fonts, shadowDock } from '@/theme/tokens';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Skeleton } from '@/ui/Skeleton';
import { Text } from '@/ui/Text';
import { parseParam, sensorDetailView } from './sensorDetailView';

// Kartu S11 memakai bayangan lebih kuat (y6 blur18) daripada kartu Beranda.
const card = [shadowDock, { padding: 16, gap: 8 }];

export function SensorDetailScreen() {
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
      <Header title="Detail sensor" subtitle={subtitle} initials={initials} />

      {q.isError ? <Banner tone={unreachable ? 'warn' : 'danger'} title={unreachable ? 'HP offline' : 'Gagal memuat sensor'} body={(q.error as Error).message} /> : null}

      {q.isPending && role !== 'demo' ? <Skeleton /> : (
        <Card style={card}>
          <Text v="section">{v.title}</Text>
          <Text v="title" style={{ fontSize: 38, opacity: v.dim ? 0.5 : 1 }} accessibilityLabel={`${v.title} ${v.value}${v.unit ? ` ${v.unit}` : ''}`}>
            {v.value}
            {v.unit && v.state !== 'kosong' ? <Text v="meta">{` ${v.unit}`}</Text> : null}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {v.chip ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.warnSoft, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
                {v.chip.label === 'Data basi' ? <Timer size={16} color={colors.warn} /> : <TriangleAlert size={16} color={colors.warn} />}
                <Text v="status" style={{ fontFamily: fonts.bodyBold }}>{v.chip.label}</Text>
              </View>
            ) : null}
            <Text v="meta" style={{ flexShrink: 1 }}>{v.meta}</Text>
          </View>
        </Card>
      )}

      <Button variant="secondary" label="Riwayat & grafik" onPress={() => router.navigate({ pathname: '/grafik', params: { param } })} />

      {v.state === 'anomali' ? <Banner tone="warn" title="Anomali terbaca" body="Nilai ini ditandai di luar rentang wajar. Bukan contoh ambang aman." /> : null}

      <Card style={card}>
        <Text v="section">Parameter lain</Text>
        {v.rows.map((r) => (
          <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text v="body" style={{ flex: 1 }}>{r.label}</Text>
            <Text v="bodyStrong" style={{ fontFamily: fonts.bodySemi }}>{r.value}</Text>
          </View>
        ))}
      </Card>

      <Card style={card}>
        <Text v="section">Status dosing otomatis</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Lock size={20} color={colors.danger} />
          <Text v="body" style={{ flex: 1 }}>Terkunci · hanya informasi. Dosis tidak dijalankan dari aplikasi.</Text>
        </View>
      </Card>
    </Screen>
  );
}
