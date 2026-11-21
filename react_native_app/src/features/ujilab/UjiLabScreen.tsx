import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '@/api/session';
import { ApiError } from '@/api/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { AdminOnly } from '@/features/alat/AdminOnly';
import { colors, fonts, radius, shadowDock } from '@/theme/tokens';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { DataRow } from '@/ui/DataRow';
import { Field } from '@/ui/Field';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Skeleton } from '@/ui/Skeleton';
import { Text } from '@/ui/Text';
import { buildHasil, parseRiwayat, parseSpek } from './ujiLab';

type Kat = 'buah' | 'sayur';
const msgOf = (e: unknown) => (e instanceof ApiError && e.status === 404 ? 'Uji lab belum tersedia di server ini.' : (e as Error).message);

export function UjiLabScreen() {
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
        <Header title="Uji lab" subtitle="Admin · hasil lab" initials={initials} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['buah', 'sayur'] as Kat[]).map((k) => {
            const on = k === kat;
            return (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { setKat(k); setIsian({}); setGalat(null); }}
                style={{ height: 44, paddingHorizontal: 14, borderRadius: radius.input, justifyContent: 'center', backgroundColor: on ? colors.accent : colors.surface, borderWidth: on ? 0 : 1, borderColor: colors.border }}>
                <Text v="label" style={{ color: on ? colors.onAccent : colors.textSecondary, fontFamily: fonts.bodySemi }}>{k === 'buah' ? 'Buah' : 'Sayur'}</Text>
              </Pressable>
            );
          })}
        </View>
        {loadErr ? <Banner tone="warn" title="Uji lab belum bisa dimuat" body={msgOf(loadErr)} /> : null}
        {galat ? <Banner tone="danger" title="Periksa isian" body={galat} /> : null}
        {save.isError ? <Banner tone="danger" title="Hasil belum tersimpan" body={msgOf(save.error)} /> : null}
        {save.isSuccess ? <Banner tone="info" title="Hasil tersimpan" /> : null}
        <Card style={[shadowDock, { padding: 16, gap: 12 }]}>
          <Text v="section">Input hasil lab: {kat === 'buah' ? 'Buah' : 'Sayur'}</Text>
          {spekQ.isPending ? <Skeleton /> : spek.length === 0 ? <Text v="meta">Belum ada parameter untuk kategori ini.</Text> : spek.map((p) => (
            <Field key={p.key} label={p.satuan ? `${p.nama} (${p.satuan})` : p.nama} keyboardType="decimal-pad" value={isian[p.key] ?? ''} onChangeText={(t) => setIsian((s) => ({ ...s, [p.key]: t }))} />
          ))}
          <Button label="Simpan hasil" loading={save.isPending} disabled={spek.length === 0} onPress={submit} />
        </Card>
        <Card style={[shadowDock, { padding: 16, gap: 8 }]}>
          <Text v="section">Riwayat hasil</Text>
          {riwayatQ.isPending ? <Text v="meta">Memuat…</Text> : (riwayatQ.data ?? []).length === 0 ? <Text v="meta">Belum ada hasil uji lab.</Text>
            : (riwayatQ.data ?? []).slice(0, 30).map((r, i) => {
              const nama = spek.find((p) => p.key === r.parameter)?.nama ?? r.parameter;
              return <DataRow key={i} label={nama} value={`${r.nilai} ${r.satuan} · ${r.tanggal}`.trim()} />;
            })}
        </Card>
      </Screen>
    </AdminOnly>
  );
}
