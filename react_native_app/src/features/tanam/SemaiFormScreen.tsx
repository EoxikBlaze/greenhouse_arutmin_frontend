import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { router } from 'expo-router';
import { api } from '@/api/session';
import { useAuth } from '@/features/auth/AuthProvider';
import { shadowDock } from '@/theme/tokens';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { OptionPicker } from './OptionPicker';
import { loadOpsiSemai, mulaiSemai } from './tanamApi';

export function SemaiFormScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [meja, setMeja] = useState<number | null>(null);
  const [tanaman, setTanaman] = useState<number | null>(null);

  const opsi = useQuery({ queryKey: ['master', 'opsi-semai'], queryFn: () => loadOpsiSemai(api) });
  const loadError = opsi.error as Error | null;

  const m = useMutation({
    mutationFn: () => mulaiSemai(api, { id_meja: meja!, id_tanaman: tanaman! }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tanam'] });
      router.navigate('/tanam');
    },
  });

  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  const ready = meja != null && tanaman != null;

  return (
    <Screen>
      <Header title="Mulai semai" subtitle="Pencatatan batch baru" initials={initials} />
      {loadError ? <Banner tone="danger" title="Daftar meja dan tanaman gagal dimuat" body={loadError.message} /> : null}
      {opsi.data?.tanpaId ? <Banner tone="warn" title="Pilihan belum bisa dipakai" body="Server belum mengirim ID meja dan tanaman, jadi semai baru belum bisa dicatat dari aplikasi." /> : null}
      {m.isError ? <Banner tone="danger" title="Catatan belum tersimpan" body={(m.error as Error).message} /> : null}
      <Card style={[shadowDock, { padding: 16, gap: 12 }]}>
        <Text v="section">Data semai</Text>
        <OptionPicker label="Meja" placeholder="Pilih meja" emptyText="Belum ada meja."
          options={opsi.data?.meja ?? []} value={meja} onChange={setMeja} />
        <OptionPicker label="Tanaman" placeholder="Pilih tanaman" emptyText="Belum ada tanaman."
          options={opsi.data?.tanaman ?? []} value={tanaman} onChange={setTanaman} />
      </Card>
      <Button label="Simpan catatan" disabled={!ready} loading={m.isPending} onPress={() => m.mutate()} />
      <Button variant="secondary" label="Batal" disabled={m.isPending} onPress={() => router.back()} />
    </Screen>
  );
}
