import { View } from 'react-native';
import { router } from 'expo-router';
import { BellOff, ChevronRight, Info, OctagonX, Send, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { icon, radius } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Banner } from '@/ui/Banner';
import { Panel } from '@/ui/Panel';
import { EmptyState } from '@/ui/EmptyState';
import { Header } from '@/ui/Header';
import { ScreenList } from '@/ui/Screen';
import { Skeleton } from '@/ui/Skeleton';
import { StatusChip } from '@/ui/StatusChip';
import { Tap } from '@/ui/Tap';
import { Text } from '@/ui/Text';
import { Level, alertView } from './alertView';
import { useAlerts } from './useAlerts';

const LEVEL: Record<Level, { tone: 'danger' | 'warn' | 'info'; Icon: LucideIcon }> = {
  kritis: { tone: 'danger', Icon: OctagonX },
  peringatan: { tone: 'warn', Icon: TriangleAlert },
  info: { tone: 'info', Icon: Info },
};

export function PeringatanScreen() {
  const c = useColors();
  const { user, role } = useAuth();
  const q = useAlerts();
  const items = (q.data?.rows ?? []).map(alertView);
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  return (
    <ScreenList
      data={items}
      keyExtractor={(a) => String(a.id)}
      onRefresh={() => q.refetch()}
      refreshing={q.isRefetching}
      header={
        <View style={{ gap: 16 }}>
          <Header title="Peringatan" subtitle={`${role === 'admin' ? 'Admin' : role === 'demo' ? 'Demo' : 'Petani'} · log peringatan`} initials={initials} />
          {q.isError ? <Banner tone="danger" title="Gagal memuat peringatan" body={(q.error as Error).message} /> : null}
          {q.isPending ? <Skeleton /> : items.length === 0 && !q.isError ? (
            <EmptyState Icon={BellOff} title="Belum ada peringatan" body="Log peringatan kosong. Semua level login dapat melihat log, konfirmasi (ack) hanya untuk admin." />
          ) : null}
        </View>
      }
      renderItem={(a) => {
        const s = LEVEL[a.level];
        return (
          <Tap accessibilityRole="button" accessibilityLabel={`${a.levelLabel}: ${a.judul}`}
            onPress={() => router.navigate({ pathname: '/detail-peringatan', params: { id: a.id } })}>
            <Panel soft>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <StatusChip label={a.levelLabel} tone={s.tone} Icon={s.Icon} />
                <Text v="meta">{a.waktu}</Text>
              </View>
              <Text v="bodyStrong">{a.judul}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text v="meta" style={{ flex: 1 }}>{a.sumber}</Text>
                <ChevronRight size={icon.md} color={c.textSecondary} />
              </View>
            </Panel>
          </Tap>
        );
      }}
      footer={items.length ? (
        <View style={{ minHeight: 48, borderRadius: radius.input, backgroundColor: c.surfaceSoft, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
          <Send size={icon.md} color={c.textSecondary} />
          <Text v="body">Lapor ke pengelola (DITUNDA)</Text>
        </View>
      ) : undefined}
    />
  );
}
