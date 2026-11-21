import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Video, VideoOff } from 'lucide-react-native';
import { API_BASE, api } from '@/api/session';
import { ApiError } from '@/api/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, shadowDock } from '@/theme/tokens';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Skeleton } from '@/ui/Skeleton';
import { StatusChip } from '@/ui/StatusChip';
import { Text } from '@/ui/Text';
import { Cam, parseCameras, previewUrl } from './cctv';

function CamCard({ cam, tick }: { cam: Cam; tick: number }) {
  const [failed, setFailed] = useState(false);
  const url = previewUrl(cam, API_BASE, tick);
  const ok = !!url && !failed;
  return (
    <Card style={[shadowDock, { padding: 12, gap: 8 }]}>
      <View style={{ height: 150, borderRadius: 12, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {ok ? (
          <Image accessibilityLabel={`Pratinjau ${cam.nama}`} source={{ uri: url!, headers: api.token ? { Authorization: `Bearer ${api.token}` } : undefined }}
            style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => setFailed(true)} onLoad={() => setFailed(false)} />
        ) : <VideoOff size={28} color={colors.textSecondary} />}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text v="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{cam.nama}</Text>
        {!cam.aktif ? <StatusChip label="Nonaktif" tone="warn" Icon={VideoOff} /> : failed ? <StatusChip label="Tidak terjangkau" tone="warn" Icon={VideoOff} /> : <StatusChip label="Aktif" tone="ok" Icon={Video} />}
      </View>
      <Text v="meta">{cam.lokasi}</Text>
    </Card>
  );
}

export function CctvScreen() {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  const q = useQuery({ queryKey: ['cctv'], queryFn: async () => parseCameras(await api.get('/cctv')), retry: false });
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 10_000); return () => clearInterval(t); }, []);
  const cams = q.data ?? [];
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  const missing = q.error instanceof ApiError && q.error.status === 404;
  const refresh = () => { q.refetch(); setTick((x) => x + 1); };

  return (
    <Screen onRefresh={refresh} refreshing={q.isRefetching}>
      <Header title="CCTV" subtitle="Pratinjau kamera kebun" initials={initials} />
      {q.isError ? <Banner tone="warn" title="Kamera belum bisa dimuat" body={missing ? 'CCTV belum tersedia di server ini.' : (q.error as Error).message} /> : null}
      {q.isPending ? <Skeleton /> : cams.length === 0 && !q.isError ? (
        <EmptyState Icon={VideoOff} title="Belum ada kamera" body="Kamera ditambahkan admin lewat aplikasi web." />
      ) : cams.map((c) => <CamCard key={c.id} cam={c} tick={tick} />)}
      <Button variant="secondary" label="Segarkan" onPress={refresh} />
    </Screen>
  );
}
