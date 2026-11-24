import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/api/session';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { Text } from '@/ui/Text';
import { alatView } from './nutrisiView';

// Apakah batch sedang dijaga alat (firmware v6 mode SEMAI). Bila belum, admin bisa meminta server mengirim SEMAI/target lagi
// (POST /tanam/kirim-alat). Ini perintah ke perangkat nyata, jadi selalu meminta konfirmasi lebih dulu.
export function StatusAlat() {
  const q = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<unknown>('/dashboard'), refetchInterval: 30_000, retry: false });
  const [yakin, setYakin] = useState(false);
  const kirim = useMutation({
    mutationFn: () => api.post<{ message?: string }>('/tanam/kirim-alat', {}),
    onSuccess: () => { setYakin(false); void q.refetch(); },
  });
  const v = alatView(q.data);
  if (!v.tampil) return null;

  return (
    <Panel gap={8}>
      <Text v="section">Penjagaan alat</Text>
      <Text v="body">{v.dijaga ? 'Alat sedang menjaga batch (mode SEMAI).' : `Batch belum dijaga alat: ${v.alasan}.`}</Text>
      {kirim.isSuccess ? <Banner tone="info" title="Perintah dikirim" body={kirim.data?.message ?? 'Perintah dikirim ke alat.'} /> : null}
      {kirim.isError ? <Banner tone="danger" title="Perintah belum terkirim" body={(kirim.error as Error).message} /> : null}
      {v.dijaga ? null : yakin ? (
        <>
          <Banner tone="warn" title="Kirim SEMAI ke alat?" body="Server akan mengirim mode SEMAI dan target ke perangkat di greenhouse. Pastikan alat dan area di sekitarnya aman." />
          <Button label="Ya, kirim ke alat" loading={kirim.isPending} onPress={() => kirim.mutate()} />
          <Button variant="secondary" label="Batal" onPress={() => setYakin(false)} />
        </>
      ) : (
        <Button variant="secondary" label="Kirim SEMAI ke alat" onPress={() => { kirim.reset(); setYakin(true); }} />
      )}
    </Panel>
  );
}
