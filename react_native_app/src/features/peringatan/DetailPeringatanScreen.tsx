import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BellOff, Send } from 'lucide-react-native';
import { api } from '@/api/session';
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
import { ackAlert, alertView } from './alertView';
import { useAlerts } from './useAlerts';

export function DetailPeringatanScreen() {
  const { user, role } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const q = useAlerts();
  const qc = useQueryClient();
  const row = q.data?.rows.find((r) => String(r.id) === id);
  const v = row ? alertView(row) : null;
  const admin = role === 'admin';
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  const ack = useMutation({
    mutationFn: () => ackAlert(api, id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <Header back="/peringatan" title="Detail peringatan" subtitle={admin ? 'Admin · dapat konfirmasi' : `${role === 'demo' ? 'Demo' : 'Petani'} · baca saja`} initials={initials} />
      {q.isError ? <Banner tone="danger" title="Gagal memuat peringatan" body={(q.error as Error).message} /> : null}
      {ack.isError ? <Banner tone="danger" title="Konfirmasi gagal" body={(ack.error as Error).message} /> : null}
      {q.isPending ? <Skeleton /> : !v ? (
        <EmptyState Icon={BellOff} title="Peringatan tidak ditemukan" body="Peringatan ini sudah tidak ada di log. Kembali ke Peringatan untuk daftar terbaru." />
      ) : (
        <>
          <Panel gap={12}>
            <Text v="value">{v.judul}</Text>
            <DataRow label="Level" value={v.levelLabel} />
            <DataRow label="Sumber" value={v.sumber} />
            <DataRow label="Waktu" value={v.waktu} last={!(admin && v.acked !== null)} />
            {admin && v.acked !== null ? <DataRow label="Status konfirmasi" value={v.acked ? 'Sudah dikonfirmasi' : 'Belum dikonfirmasi'} last /> : null}
          </Panel>
          {admin ? (
            q.data?.canAck && v.acked !== true ? <Button label="Konfirmasi (ack)" loading={ack.isPending} onPress={() => ack.mutate()} /> : null
          ) : (
            <Banner tone="danger" title="Tidak diizinkan" body="Konfirmasi peringatan hanya bisa dilakukan admin." />
          )}
          <Button variant="secondary" label="Tanya Asisten GARAP" onPress={() => router.navigate('/asisten')} />
          {admin && !q.data?.canAck ? <Banner tone="info" title="Konfirmasi belum tersedia" body="Server ini belum menyediakan konfirmasi (ack) peringatan." /> : null}
          {admin ? <EmptyState Icon={Send} title="Lapor ke pengelola ditunda" body="Fitur lapor ke pengelola belum diaktifkan pada versi ini." /> : null}
        </>
      )}
    </Screen>
  );
}
