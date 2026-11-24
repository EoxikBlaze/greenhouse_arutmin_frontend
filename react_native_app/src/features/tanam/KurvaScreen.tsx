import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/api/session';
import { AdminOnly } from '@/features/alat/AdminOnly';
import { useAuth } from '@/features/auth/AuthProvider';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Field } from '@/ui/Field';
import { Header } from '@/ui/Header';
import { Panel } from '@/ui/Panel';
import { Screen } from '@/ui/Screen';
import { Skeleton } from '@/ui/Skeleton';
import { Text } from '@/ui/Text';
import { isianAwalKurva, kolomKurva, kurvaBody } from './nutrisiView';
import { useTanam } from './useTanam';

// Kurva nutrisi SATU batch (PUT /tanam/semai/:id_semai/kurva). Hari pertama semai: seluruh kurva diganti.
// Sesudahnya: target hari ini tetap, lalu naik rata ke target baru. Batch lain tidak ikut berubah.
export function KurvaScreen() {
  return <AdminOnly><Isi /></AdminOnly>;
}

function Isi() {
  const { user } = useAuth();
  const { tipe, id } = useLocalSearchParams<{ tipe?: string; id?: string }>();
  const q = useTanam();
  const qc = useQueryClient();
  const r = q.data?.find((x) => x.tipe === tipe && String(x.id) === id);
  const n = r?.nutrisi ?? null;
  const cara = n?.kurva?.cara === 'tahap' ? 'tahap' : 'harian';
  const berjalan = (n?.hari_semai ?? 0) > 0; // hari pertama semai = 0
  const kolom = kolomKurva(cara, berjalan);
  const [isi, setIsi] = useState<Record<string, string> | null>(null);
  const nilai = isi ?? isianAwalKurva(n?.kurva, n?.ph_min, n?.ph_max);
  const [tinjau, setTinjau] = useState(false);
  const [local, setLocal] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  const kirim = useMutation({
    mutationFn: () => api.put<{ message?: string; peringatan?: string | null }>(`/tanam/semai/${r!.id_semai}/kurva`, kurvaBody(nilai, kolom).body),
    onSuccess: async (d) => {
      setPesan([d?.message ?? 'Kurva diubah.', d?.peringatan].filter(Boolean).join(' '));
      setTinjau(false);
      await qc.invalidateQueries({ queryKey: ['tanam'] });
    },
  });

  const lanjut = () => {
    const { galat } = kurvaBody(nilai, kolom);
    setLocal(galat);
    if (!galat) setTinjau(true);
  };
  const ringkas = kolom.filter((k) => (nilai[k.key] ?? '').trim()).map((k) => `${k.label}: ${nilai[k.key].trim()}`).join(' · ');

  return (
    <Screen>
      <Header back="/tanam" title="Target nutrisi batch" subtitle={r ? `${r.varietas ?? 'Tanaman'} · #${r.id}` : 'Batch'} initials={initials} />
      {q.isPending ? <Skeleton /> : !r || r.id_semai == null ? (
        <EmptyState title="Batch tidak ditemukan" body="Batch ini tidak ada di daftar tanam atau belum punya akar semai." />
      ) : (
        <>
          <Text v="metaOnBg">
            {cara === 'tahap'
              ? 'ppm dijaga tetap per tahap. Angka tahap yang sedang berjalan berlaku mulai kiriman target berikutnya ke alat.'
              : berjalan && n?.target_hari_ini != null
                ? `Target hari ini ${n.target_hari_ini} ppm tetap (hari ke-${(n.hari_semai ?? 0) + 1} sejak mulai semai). Mulai besok ppm naik rata ke target baru. Hari semai sampai panen tidak berubah, dan batch lain tidak ikut berubah.`
                : 'Batch baru mulai hari ini: seluruh kurva diganti. Batch lain dari tanaman yang sama tidak ikut berubah.'}
          </Text>
          {pesan ? <Banner tone="info" title="Tersimpan" body={pesan} /> : null}
          {local ? <Banner tone="danger" title="Periksa isian" body={local} /> : null}
          {kirim.isError ? <Banner tone="danger" title="Belum tersimpan" body={(kirim.error as Error).message} /> : null}
          <Panel gap={12}>
            {!tinjau ? (
              <>
                {kolom.map((k) => (
                  <Field key={k.key} label={k.label} value={nilai[k.key] ?? ''} keyboardType="decimal-pad" onChangeText={(v) => setIsi({ ...nilai, [k.key]: v })} />
                ))}
                <Button label="Tinjau perubahan" onPress={lanjut} />
              </>
            ) : (
              <>
                <Text v="section">Tinjau perubahan</Text>
                <Text v="body">{ringkas}</Text>
                <Text v="caption">Perubahan ini disimpan di server dan dipakai dosing otomatis untuk batch ini.</Text>
                <Button label="Ya, simpan" loading={kirim.isPending} onPress={() => kirim.mutate()} />
                <Button variant="secondary" label="Kembali" onPress={() => setTinjau(false)} />
              </>
            )}
          </Panel>
        </>
      )}
    </Screen>
  );
}
