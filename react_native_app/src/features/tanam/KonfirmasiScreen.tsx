import { useMutation, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRightLeft, Wheat } from 'lucide-react-native';
import { api } from '@/api/session';
import { useAuth } from '@/features/auth/AuthProvider';
import { icon } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TipeTahap, catatPanen, pindahTahap } from './tanamApi';
import { batchView, judulTahap, nextTahap } from './tanamView';
import { useTanam } from './useTanam';

const TIPE: TipeTahap[] = ['semai', 'peremajaan', 'pendewasaan'];

export function KonfirmasiScreen() {
  const c = useColors();
  const { user } = useAuth();
  const p = useLocalSearchParams<{ tipe?: string; id?: string; aksi?: string }>();
  const tipe = TIPE.find((t) => t === p.tipe);
  const panen = p.aksi === 'panen';
  const id = p.id;
  const qc = useQueryClient();
  const list = useTanam();
  const row = list.data?.find((r) => r.tipe === tipe && String(r.id) === id);
  const next = tipe ? nextTahap(tipe) : null;

  const m = useMutation({
    mutationFn: () => (panen ? catatPanen(api, id!) : pindahTahap(api, tipe!, id!)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tanam'] });
      router.navigate('/tanam');
    },
    // Gagal di tengah (mis. panggilan kedua): muat ulang supaya daftar jujur.
    onError: () => { qc.invalidateQueries({ queryKey: ['tanam'] }); },
  });

  const invalid = !tipe || !id || (panen ? tipe !== 'pendewasaan' : !next || next === 'panen');
  const Icon = panen ? Wheat : ArrowRightLeft;
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  return (
    <Screen>
      <Header back="/tanam" title={panen ? 'Konfirmasi panen' : 'Konfirmasi'} subtitle={row ? batchView(row).nama : 'Batch'} initials={initials} />
      {m.isError ? <Banner tone="danger" title="Catatan belum tersimpan" body={(m.error as Error).message} /> : null}
      {invalid ? <Banner tone="danger" title="Aksi tidak tersedia" body="Tahap batch ini tidak bisa dicatat dari sini." /> : (
        <Panel gap={12}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon size={icon.lg} color={c.accent} />
            <Text v="value" style={{ flex: 1 }}>{panen ? 'Catat panen batch ini?' : `Pindah ke ${judulTahap(next!)}?`}</Text>
          </View>
          <Text v="body">
            {panen
              ? 'Panen dicatat di buku tanam. Tidak menggerakkan pompa dan tidak mengubah alat.'
              : 'Tindakan ini hanya menyimpan CATATAN tahap pada batch. Tidak ada perintah ke perangkat, alat tidak bergerak.'}
          </Text>
          <Button label={panen ? 'Ya, catat panen' : 'Ya, simpan catatan'} loading={m.isPending} onPress={() => m.mutate()} />
          <Button variant="secondary" label="Batal" disabled={m.isPending} onPress={() => router.back()} />
        </Panel>
      )}
    </Screen>
  );
}
