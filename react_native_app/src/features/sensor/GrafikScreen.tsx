import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleHelp, LineChart } from 'lucide-react-native';
import { api } from '@/api/session';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, fonts, radius, shadowDock } from '@/theme/tokens';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Skeleton } from '@/ui/Skeleton';
import { Text } from '@/ui/Text';
import { BarChart } from './BarChart';
import { MonitoringRow, chartView } from './chartView';
import { Param, parseParam } from './sensorDetailView';

type Chip = 'ph' | 'tds' | 'waterTemp';
const CHIPS: { key: Chip; label: string; title: string }[] = [
  { key: 'ph', label: 'pH air', title: 'Riwayat pH air' },
  { key: 'tds', label: 'Nutrisi TDS', title: 'Riwayat nutrisi TDS' },
  { key: 'waterTemp', label: 'Suhu air', title: 'Riwayat suhu air' },
];

export function GrafikScreen() {
  const { user, role } = useAuth();
  const fromParam = parseParam(useLocalSearchParams<{ param?: string }>().param);
  const [chip, setChip] = useState<Chip>(CHIPS.some((c) => c.key === fromParam) ? (fromParam as Chip) : 'ph');
  const demo = role === 'demo';

  const q = useQuery({
    queryKey: ['monitoring', 'chart-data'],
    queryFn: async () => {
      const rows = await api.get<MonitoringRow[]>('/monitoring/chart-data');
      if (!Array.isArray(rows)) throw new Error('Respons riwayat tidak sesuai kontrak.');
      return rows;
    },
    enabled: !demo && chip !== 'tds',
    refetchInterval: 60_000,
  });

  const view = useMemo(() => (q.data && chip !== 'tds' ? chartView(q.data, chip, new Date()) : null), [q.data, chip]);
  const current = CHIPS.find((c) => c.key === chip)!;
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  const back: Param = chip;

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <Header title="Grafik & riwayat" subtitle={chip === 'tds' ? 'Nutrisi TDS ppm' : 'Node utama'} initials={initials} />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {CHIPS.map((c) => {
          const on = c.key === chip;
          return (
            <Pressable key={c.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setChip(c.key)}
              style={{ height: 44, paddingHorizontal: 14, borderRadius: radius.input, justifyContent: 'center', backgroundColor: on ? colors.accent : colors.surface, borderWidth: on ? 0 : 1, borderColor: colors.border }}>
              <Text v="label" style={{ color: on ? colors.onAccent : colors.textSecondary, fontFamily: fonts.bodySemi }}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {q.isError ? <Banner tone="danger" title="Gagal memuat riwayat" body={(q.error as Error).message} /> : null}

      {q.isPending && q.fetchStatus !== 'idle' ? <Skeleton /> : (
        <Card style={[shadowDock, { padding: 16, gap: 12 }]}>
          <Text v="section">{current.title}</Text>
          {demo ? <EmptyState Icon={LineChart} title="Riwayat disembunyikan" body="Akun demo tidak menampilkan nilai sensor." />
            : chip === 'tds' ? <EmptyState Icon={CircleHelp} title="Grafik nutrisi belum tersedia" body="Grafik nutrisi belum tersedia." />
            : !view || view.empty ? <EmptyState Icon={LineChart} title="Belum ada riwayat" body="Grafik muncul setelah ada data riwayat dari perangkat." />
            : (
              <>
                <BarChart bars={view.bars} summary={`${current.title}, 12 jam terakhir`} />
                <Text v="meta">Riwayat 12 jam.</Text>
              </>
            )}
        </Card>
      )}

      <Button variant="secondary" label="Kembali ke detail sensor" onPress={() => router.navigate({ pathname: '/sensor', params: { param: back } })} />
    </Screen>
  );
}
