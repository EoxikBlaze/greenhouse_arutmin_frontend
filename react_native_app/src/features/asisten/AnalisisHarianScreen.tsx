import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react-native';
import { api } from '@/api/session';
import { ApiError } from '@/api/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Chips } from '@/ui/Chips';
import { EmptyState } from '@/ui/EmptyState';
import { Header } from '@/ui/Header';
import { Panel } from '@/ui/Panel';
import { Screen } from '@/ui/Screen';
import { Skeleton } from '@/ui/Skeleton';
import { StatusChip } from '@/ui/StatusChip';
import { Text } from '@/ui/Text';
import { jam } from '@/features/beranda/sensorView';
import { PRIORITAS_LABEL, parseDaftar, parseLaporan } from './analisisView';

const URL = '/api/ai/analisis-harian';
const TONE = { tinggi: { tone: 'danger', Icon: TriangleAlert }, sedang: { tone: 'warn', Icon: CircleAlert }, rendah: { tone: 'ok', Icon: CircleCheck } } as const;

export function AnalisisHarianScreen() {
  const { user, role } = useAuth();
  const [tanggal, setTanggal] = useState<string | null>(null);
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  const daftarQ = useQuery({ queryKey: ['analisis', 'daftar'], queryFn: async () => parseDaftar(await api.get(URL)) });
  const lapQ = useQuery({ queryKey: ['analisis', tanggal ?? 'terbaru'], queryFn: async () => parseLaporan(await api.get(tanggal ? `${URL}/${tanggal}` : `${URL}/terbaru`)) });
  const jalankan = useMutation({
    mutationFn: () => api.post(`${URL}/jalankan`, {}),
    onSuccess: () => { setTanggal(null); void daftarQ.refetch(); void lapQ.refetch(); },
  });

  const lap = lapQ.data;
  const missing = lapQ.error instanceof ApiError && lapQ.error.status === 404;
  const chips = (daftarQ.data ?? []).slice(0, 7).map((d) => ({ key: d.tanggal, label: d.tanggal.slice(5).split('-').reverse().join('/') }));
  const t = lap ? TONE[lap.isi.prioritas] : null;

  return (
    <Screen onRefresh={() => { void lapQ.refetch(); void daftarQ.refetch(); }} refreshing={lapQ.isRefetching}>
      <Header back="/asisten" title="Analisis harian" subtitle="Rekomendasi terjadwal 07.00 WIB" initials={initials} />
      {role === 'demo' ? <Banner tone="info" title="Mode demo" body="Akun demo tidak bisa menjalankan analisis." /> : null}
      {lapQ.isError ? <Banner tone="warn" title="Analisis belum bisa dimuat" body={missing ? 'Analisis harian belum tersedia di server ini.' : (lapQ.error as Error).message} /> : null}
      {jalankan.isError ? <Banner tone="danger" title="Analisis belum berjalan" body={(jalankan.error as Error).message} /> : null}

      {chips.length > 1 ? <Chips options={chips} value={tanggal ?? chips[0].key} onChange={setTanggal} /> : null}

      {lapQ.isPending ? <Skeleton /> : lap && t ? (
        <Panel gap={12}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <StatusChip label={PRIORITAS_LABEL[lap.isi.prioritas]} tone={t.tone} Icon={t.Icon} />
            <Text v="meta">{`${lap.pemicu === 'jadwal' ? 'Terjadwal' : 'Dijalankan manual'}${lap.diperbaruiPada ? ` · ${jam(lap.diperbaruiPada)}` : ''}`}</Text>
          </View>
          <Text v="section">{lap.isi.judul}</Text>
          {lap.isi.ringkasan_utama ? <Text v="body">{lap.isi.ringkasan_utama}</Text> : null}
          {lap.isi.bagian.map((b) => (
            <View key={b.judul} style={{ gap: 4 }}>
              <Text v="label">{b.judul}</Text>
              {b.butir.map((x, i) => <Text key={i} v="body">{`• ${x}`}</Text>)}
            </View>
          ))}
          <Text v="caption">Rekomendasi saja. Analisis ini tidak menjalankan alat apa pun.</Text>
        </Panel>
      ) : !lapQ.isError ? (
        <EmptyState title="Belum ada analisis" body="Laporan pertama muncul setelah analisis terjadwal 07.00 WIB berjalan." />
      ) : null}

      {role === 'admin' && !missing ? <Button label="Jalankan sekarang" loading={jalankan.isPending} onPress={() => jalankan.mutate()} /> : null}
    </Screen>
  );
}
