import { Fragment } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Sprout } from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { icon } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { EmptyState } from '@/ui/EmptyState';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { SectionTitle } from '@/ui/SectionTitle';
import { Skeleton } from '@/ui/Skeleton';
import { Tap } from '@/ui/Tap';
import { Text } from '@/ui/Text';
import { StatusAlat } from './StatusAlat';
import { groupByTahap } from './tanamView';
import { useTanam } from './useTanam';

const EMPTY_BODY = 'Belum ada batch pada tahap ini. Batch dibuat lewat Mulai semai dan disimpan sebagai catatan.';

export function TanamScreen() {
  const c = useColors();
  const { user, role } = useAuth();
  const q = useTanam();
  const groups = groupByTahap(q.data ?? []);
  const allEmpty = groups.every((g) => g.batches.length === 0);
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <Header title="Tanam" subtitle={`Kebun Vertonik · ${role ?? ''}`} initials={initials} />
      <Button label="Mulai semai" onPress={() => router.navigate('/mulai-semai')} />
      {role === 'admin' ? <StatusAlat /> : null}
      {role === 'demo' ? null : <Button variant="secondary" label="Target nutrisi" onPress={() => router.navigate('/naik-harian')} />}
      {q.isError ? <Banner tone="danger" title="Gagal memuat tanam" body={(q.error as Error).message} /> : null}
      {q.isPending ? <Skeleton /> : allEmpty ? <SectionTitle title="Tahap aktif" /> : null}
      {!q.isPending && groups.map((g) => (
        <Fragment key={g.tahap}>
          {allEmpty ? null : <SectionTitle title={g.judul} />}
          {g.batches.length === 0 ? (
            <EmptyState Icon={Sprout} title={`${g.judul}: belum ada batch`} body={EMPTY_BODY} />
          ) : g.batches.map((b) => (
            <Tap key={`${b.tipe}-${b.id}`} accessibilityRole="button" accessibilityLabel={b.nama}
              onPress={() => router.navigate({ pathname: '/batch', params: { tipe: b.tipe, id: String(b.id) } })}>
              <Panel gap={8}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text v="section" style={{ flex: 1 }}>{b.nama}</Text>
                  <ChevronRight size={icon.md} color={c.textSecondary} />
                </View>
                <Text v="body">{b.tahapLabel}</Text>
                <Text v="meta">{b.tanggal}</Text>
              </Panel>
            </Tap>
          ))}
        </Fragment>
      ))}
    </Screen>
  );
}
