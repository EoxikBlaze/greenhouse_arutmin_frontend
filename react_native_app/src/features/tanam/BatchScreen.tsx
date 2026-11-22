import { router, useLocalSearchParams } from 'expo-router';
import { Sprout } from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { DataRow } from '@/ui/DataRow';
import { EmptyState } from '@/ui/EmptyState';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Skeleton } from '@/ui/Skeleton';
import { Text } from '@/ui/Text';
import { batchView, judulTahap, nextTahap, tanggalId } from './tanamView';
import { useTanam } from './useTanam';

export function BatchScreen() {
  const { user } = useAuth();
  const { tipe, id } = useLocalSearchParams<{ tipe?: string; id?: string }>();
  const q = useTanam();
  const row = q.data?.find((r) => r.tipe === tipe && String(r.id) === id);
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  const v = row ? batchView(row) : null;
  const next = row ? nextTahap(row.tipe) : null;

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <Header back="/tanam" title="Detail batch" subtitle={v?.nama ?? 'Batch'} initials={initials} />
      {q.isError ? <Banner tone="danger" title="Gagal memuat batch" body={(q.error as Error).message} /> : null}
      {q.isPending ? <Skeleton /> : !row || !v ? (
        <EmptyState Icon={Sprout} title="Batch tidak ditemukan" body="Batch ini sudah tidak ada di daftar tanam. Kembali ke Tanam untuk melihat daftar terbaru." />
      ) : (
        <>
          <Panel gap={12}>
            <Text v="value">{v.nama}</Text>
            <DataRow label="Tahap" value={judulTahap(row.tipe)} />
            <DataRow label="Tanaman" value={row.varietas?.trim() || 'Tanpa nama'} />
            <DataRow label="Mulai" value={tanggalId(row.mulai) ?? 'Belum ada tanggal'} last />
          </Panel>
          <Panel gap={8}>
            <Text v="section">Catatan pencatatan</Text>
            <Text v="body">Pindah tahap dan panen hanya menyimpan CATATAN. Pencatatan ini tidak menggerakkan alat apa pun.</Text>
          </Panel>
          {next && next !== 'panen' ? (
            <Button label={`Pindah ke ${judulTahap(next)}`} onPress={() => router.navigate({ pathname: '/konfirmasi', params: { tipe: row.tipe, id: String(row.id), aksi: 'pindah' } })} />
          ) : null}
          {row.tipe === 'pendewasaan' ? (
            <Button variant="secondary" label="Catat panen" onPress={() => router.navigate({ pathname: '/konfirmasi', params: { tipe: row.tipe, id: String(row.id), aksi: 'panen' } })} />
          ) : null}
        </>
      )}
      <Button variant="secondary" label="Kembali ke Tanam" onPress={() => router.navigate('/tanam')} />
    </Screen>
  );
}
