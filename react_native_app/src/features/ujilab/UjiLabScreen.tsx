import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { api } from '@/api/session';
import { ApiError } from '@/api/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { AdminOnly } from '@/features/alat/AdminOnly';
import { useColors } from '@/theme/useColors';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { DataRow } from '@/ui/DataRow';
import { Field } from '@/ui/Field';
import { Chips } from '@/ui/Chips';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Skeleton } from '@/ui/Skeleton';
import { Text } from '@/ui/Text';
import { buildHasil, parseRiwayat, parseSpek } from './ujiLab';

type Kat = 'buah' | 'sayur';
const KATS: { key: Kat; label: string }[] = [{ key: 'buah', label: 'Buah' }, { key: 'sayur', label: 'Sayur' }];
const msgOf = (e: unknown) => (e instanceof ApiError && e.status === 404 ? 'Uji lab belum tersedia di server ini.' : (e as Error).message);

export function UjiLabScreen() {
  const c = useColors();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [kat, setKat] = useState<Kat>('buah');
  const [isian, setIsian] = useState<Record<string, string>>({});
  const [galat, setGalat] = useState<string | null>(null);

  const spekQ = useQuery({ queryKey: ['ujilab', 'spek'], queryFn: async () => parseSpek(await api.get('/uji-lab/parameter')), retry: false });
  const riwayatQ = useQuery({ queryKey: ['ujilab', 'riwayat', kat], queryFn: async () => parseRiwayat(await api.get(`/uji-lab?kategori=${kat}&limit=100`)), retry: false });
  const spek = spekQ.data?.[kat] ?? [];

  const save = useMutation({
    mutationFn: (hasil: unknown) => api.post('/uji-lab', { kategori: kat, hasil }),
    onSuccess: () => { setIsian({}); qc.invalidateQueries({ queryKey: ['ujilab', 'riwayat'] }); },
  });
  const submit = () => {
    const h = buildHasil(spek, isian);
    setGalat(h.galat);
    if (!h.galat) save.mutate(h.hasil);
  };
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  const loadErr = spekQ.error ?? riwayatQ.error;

  return (
    <AdminOnly>
      <Screen onRefresh={() => { spekQ.refetch(); riwayatQ.refetch(); }}>
        <Header back="/alat" title="Uji lab" subtitle="Admin · hasil lab" initials={initials} />
        <Chips options={KATS} value={kat} onChange={(k) => { setKat(k); setIsian({}); setGalat(null); }} />
        {loadErr ? <Banner tone="warn" title="Uji lab belum bisa dimuat" body={msgOf(loadErr)} /> : null}
        {galat ? <Banner tone="danger" title="Periksa isian" body={galat} /> : null}
        {save.isError ? <Banner tone="danger" title="Hasil belum tersimpan" body={msgOf(save.error)} /> : null}
        {save.isSuccess ? <Banner tone="info" title="Hasil tersimpan" /> : null}
        <Panel gap={12}>
          <Text v="section">Input hasil lab: {kat === 'buah' ? 'Buah' : 'Sayur'}</Text>
          {spekQ.isPending ? <Skeleton /> : spek.length === 0 ? <Text v="meta">Belum ada parameter untuk kategori ini.</Text> : spek.map((p) => (
            <Field key={p.key} label={p.satuan ? `${p.nama} (${p.satuan})` : p.nama} keyboardType="decimal-pad" value={isian[p.key] ?? ''} onChangeText={(t) => setIsian((s) => ({ ...s, [p.key]: t }))} />
          ))}
          <Button label="Simpan hasil" loading={save.isPending} disabled={spek.length === 0} onPress={submit} />
        </Panel>
        <Panel gap={8}>
          <Text v="section">Riwayat hasil</Text>
          {riwayatQ.isPending ? <Text v="meta">Memuat…</Text> : (riwayatQ.data ?? []).length === 0 ? <Text v="meta">Belum ada hasil uji lab.</Text>
            : (riwayatQ.data ?? []).slice(0, 30).map((r, i, a) => {
              const nama = spek.find((p) => p.key === r.parameter)?.nama ?? r.parameter;
              return <DataRow key={i} last={i === a.length - 1} label={nama} value={`${r.nilai} ${r.satuan} · ${r.tanggal}`.trim()} />;
            })}
        </Panel>
      </Screen>
    </AdminOnly>
  );
}
