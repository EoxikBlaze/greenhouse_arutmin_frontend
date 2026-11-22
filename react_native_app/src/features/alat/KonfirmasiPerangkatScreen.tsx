import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Check, Timer, TimerOff, X } from 'lucide-react-native';
import { api } from '@/api/session';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { StatusChip } from '@/ui/StatusChip';
import { Text } from '@/ui/Text';
import { AdminOnly } from './AdminOnly';
import { CommandStatus, WaterControl, commandStatus, stopPompa } from './deviceView';

const CHIP = {
  menunggu: { label: 'Menunggu', tone: 'warn', Icon: Timer },
  selesai: { label: 'Selesai', tone: 'ok', Icon: Check },
  kedaluwarsa: { label: 'Kedaluwarsa', tone: 'warn', Icon: TimerOff },
} as const;

export function KonfirmasiPerangkatScreen() {
  const { user } = useAuth();
  const [sentAt, setSentAt] = useState<number | null>(null);
  const send = useMutation({ mutationFn: () => stopPompa(api), onSuccess: () => setSentAt(Date.now()) });

  const status = useQuery({
    queryKey: ['watercontrol', 'status', sentAt],
    queryFn: () => api.get<WaterControl>('/watercontrol/status'),
    enabled: sentAt !== null,
    refetchInterval: (q) => {
      const s = sentAt === null ? null : commandStatus(q.state.data ?? null, sentAt, Date.now());
      return s === 'menunggu' ? 3_000 : false;
    },
  });
  const cur: CommandStatus | null = sentAt === null ? null : commandStatus(status.data ?? null, sentAt, Date.now());
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  const done = cur === 'selesai' || cur === 'kedaluwarsa';

  return (
    <AdminOnly>
      <Screen>
        <Header back="/alat" title="Konfirmasi perintah" subtitle="STOP pompa" initials={initials} />
        <Panel gap={12}>
          <Text v="value">Hentikan pompa sekarang?</Text>
          <Text v="body">Permintaan STOP pompa dikirim. Tunggu konfirmasi perangkat; jika pompa tidak berhenti, gunakan E-STOP fisik.</Text>
          <Button label="Kirim ke antrean" loading={send.isPending} disabled={sentAt !== null && !done} onPress={() => send.mutate()} />
          <Button variant="secondary" label={sentAt === null ? 'Batal' : 'Kembali ke Alat'} onPress={() => router.navigate('/alat')} />
        </Panel>
        <Panel gap={8}>
          <Text v="section">Status perintah</Text>
          <Text v="body">Alur: Menunggu → Selesai / Ditolak / Kedaluwarsa. Menunggu bukan berarti pompa sudah berhenti.</Text>
          {send.isError ? (
            <View style={{ gap: 8 }}>
              <StatusChip label="Ditolak" tone="danger" Icon={X} />
              <Text v="meta">{(send.error as Error).message}</Text>
            </View>
          ) : cur ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
              <StatusChip {...CHIP[cur]} />
              <Text v="meta">{cur === 'menunggu' ? 'Dipantau tiap 3 detik' : 'Pantauan berhenti'}</Text>
            </View>
          ) : <Text v="meta">Belum ada perintah dikirim.</Text>}
        </Panel>
      </Screen>
    </AdminOnly>
  );
}
