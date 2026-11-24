import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { api } from '@/api/session';
import { ApiError } from '@/api/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { icon } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Field } from '@/ui/Field';
import { Header } from '@/ui/Header';
import { Panel } from '@/ui/Panel';
import { Screen } from '@/ui/Screen';
import { Skeleton } from '@/ui/Skeleton';
import { Tap } from '@/ui/Tap';
import { Text } from '@/ui/Text';
import { NaikHarian, angka, kenaikanPerHari, naikBody, naikMati, parseAngka, parseNaikHarian, validasiNaik } from './nutrisiView';

const URL = '/dosing/naik-harian';

// Target nutrisi naik harian per tanaman. Nilai ini dipakai dosing otomatis, jadi setiap perubahan lewat tahap tinjau.
export function NaikHarianScreen() {
  const { user, role } = useAuth();
  const c = useColors();
  const qc = useQueryClient();
  const bisaUbah = role !== 'demo';
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  const q = useQuery({ queryKey: ['naik-harian'], queryFn: async () => parseNaikHarian(await api.get(URL)), retry: false });
  const [pilih, setPilih] = useState<NaikHarian | null>(null);
  const [isi, setIsi] = useState({ awal: '400', target: '', hari: '' });
  const [matikan, setMatikan] = useState(false);
  const [tinjau, setTinjau] = useState(false);
  const [local, setLocal] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const ubah = useMutation({
    mutationFn: () => api.put(`${URL}/${pilih!.id_tanaman}`, matikan ? naikMati : naikBody(isi)),
    onSuccess: async () => {
      setOk(matikan ? `Naik harian ${pilih!.nama} dimatikan.` : `Target ${pilih!.nama} tersimpan.`);
      setPilih(null); setTinjau(false); setMatikan(false);
      await qc.invalidateQueries({ queryKey: ['naik-harian'] });
    },
  });

  const buka = (t: NaikHarian) => {
    setPilih(t); setOk(null); setLocal(null); setTinjau(false); setMatikan(false); ubah.reset();
    setIsi({ awal: t.ppm_awal !== null ? String(t.ppm_awal).replace('.', ',') : '400', target: t.ppm_target !== null ? String(t.ppm_target).replace('.', ',') : '', hari: t.hari_capai !== null ? String(t.hari_capai) : '' });
  };

  const lanjut = () => {
    const err = validasiNaik(isi);
    setLocal(err);
    if (!err) setTinjau(true);
  };

  const ambang = q.data?.ambangMaks ?? null;
  const target = parseAngka(isi.target);
  const lewatAmbang = !matikan && ambang !== null && target !== null && target > ambang;
  const perHari = kenaikanPerHari(parseAngka(isi.awal), target, parseAngka(isi.hari));
  const missing = q.error instanceof ApiError && q.error.status === 404;

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <Header back="/tanam" title="Target nutrisi" subtitle="Naik harian per tanaman" initials={initials} />
      <Text v="metaOnBg">Isi target akhir tiap tanaman. Mulai hari pindah netpot, target ppm penampung naik sedikit tiap hari sampai target akhir, lalu ditahan sampai panen. Tahap semai tetap memakai preset.</Text>
      {!bisaUbah ? <Banner tone="info" title="Mode demo" body="Akun demo hanya bisa melihat target." /> : null}
      {ok ? <Banner tone="info" title="Tersimpan" body={ok} /> : null}
      {q.isError ? <Banner tone="warn" title="Target belum bisa dimuat" body={missing ? 'Target nutrisi belum tersedia di server ini.' : (q.error as Error).message} /> : null}

      {pilih ? (
        <Panel gap={12}>
          <Text v="section">{`Target nutrisi · ${pilih.nama}`}</Text>
          {local ? <Banner tone="danger" title="Periksa isian" body={local} /> : null}
          {ubah.isError ? <Banner tone="danger" title="Belum tersimpan" body={(ubah.error as Error).message} /> : null}
          {!tinjau ? (
            <>
              <Field label="Target akhir (ppm)" value={isi.target} onChangeText={(v) => setIsi({ ...isi, target: v })} keyboardType="decimal-pad" />
              <Field label="Dicapai setelah (hari)" value={isi.hari} onChangeText={(v) => setIsi({ ...isi, hari: v })} keyboardType="number-pad" />
              <Field label="ppm awal" value={isi.awal} onChangeText={(v) => setIsi({ ...isi, awal: v })} keyboardType="decimal-pad" />
              <Button label="Tinjau perubahan" onPress={lanjut} />
              {pilih.ppm_target !== null ? <Button variant="secondary" label="Matikan naik harian" onPress={() => { setMatikan(true); setTinjau(true); }} /> : null}
              <Button variant="secondary" label="Batal" onPress={() => setPilih(null)} />
            </>
          ) : (
            <>
              <Text v="body">
                {matikan
                  ? `Naik harian ${pilih.nama} akan dimatikan. Dosing kembali memakai preset.`
                  : `Target ppm penampung naik ${perHari !== null ? angka(Math.round(perHari * 10) / 10) : '—'} ppm per hari, dari ${isi.awal} ke ${isi.target} ppm dalam ${isi.hari} hari, lalu ditahan sampai panen.`}
              </Text>
              {lewatAmbang ? <Banner tone="warn" title="Melewati ambang TDS" body={`Ambang alert TDS saat ini ${angka(ambang!)} ppm, jadi alert "di luar batas" akan muncul. Naikkan ambang di web bila memang disengaja.`} /> : null}
              <Text v="caption">Perubahan ini disimpan di server dan dipakai dosing otomatis.</Text>
              <Button label="Ya, simpan" loading={ubah.isPending} onPress={() => ubah.mutate()} />
              <Button variant="secondary" label="Kembali" onPress={() => { setTinjau(false); setMatikan(false); }} />
            </>
          )}
        </Panel>
      ) : q.isPending ? <Skeleton /> : (q.data?.list.length ?? 0) === 0 && !q.isError ? (
        <EmptyState title="Belum ada tanaman" body="Tambahkan jenis tanaman di web terlebih dahulu." />
      ) : (
        (q.data?.list ?? []).map((t) => {
          const per = kenaikanPerHari(t.ppm_awal, t.ppm_target, t.hari_capai);
          return (
            <Tap key={t.id_tanaman} disabled={!bisaUbah} accessibilityLabel={`Ubah target nutrisi ${t.nama}`} onPress={() => buka(t)}>
              <Panel gap={4}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text v="bodyStrong" style={{ flex: 1 }}>{t.nama}</Text>
                  {bisaUbah ? <ChevronRight size={icon.md} color={c.textSecondary} /> : null}
                </View>
                <Text v="meta">
                  {t.ppm_target !== null && t.hari_capai !== null
                    ? `${t.ppm_awal !== null ? angka(t.ppm_awal) : '—'} → ${angka(t.ppm_target)} ppm dalam ${t.hari_capai} hari${per !== null ? ` · +${angka(Math.round(per * 10) / 10)}/hari` : ''}`
                    : 'Belum diatur: dosing memakai preset'}
                </Text>
              </Panel>
            </Tap>
          );
        })
      )}
    </Screen>
  );
}
