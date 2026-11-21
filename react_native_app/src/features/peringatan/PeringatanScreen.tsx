import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { BellOff, ChevronRight, Info, OctagonX, Send, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, radius } from '@/theme/tokens';
import { Banner } from '@/ui/Banner';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Skeleton } from '@/ui/Skeleton';
import { Text } from '@/ui/Text';
import { Level, alertView } from './alertView';
import { useAlerts } from './useAlerts';

export const LEVEL_STYLE: Record<Level, { fg: string; bg: string; Icon: LucideIcon }> = {
  kritis: { fg: colors.danger, bg: colors.dangerSoft, Icon: OctagonX },
  peringatan: { fg: colors.warn, bg: colors.warnSoft, Icon: TriangleAlert },
  info: { fg: colors.info, bg: colors.infoSoft, Icon: Info },
};

export function PeringatanScreen() {
  const { user, role } = useAuth();
  const q = useAlerts();
  const items = (q.data?.rows ?? []).map(alertView);
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <Header title="Peringatan" subtitle={`${role === 'admin' ? 'Admin' : role === 'demo' ? 'Demo' : 'Petani'} · log peringatan`} initials={initials} />
      {q.isError ? <Banner tone="danger" title="Gagal memuat peringatan" body={(q.error as Error).message} /> : null}
      {q.isPending ? <Skeleton /> : items.length === 0 && !q.isError ? (
        <EmptyState Icon={BellOff} title="Belum ada peringatan" body="Log peringatan kosong. Semua level login dapat melihat log, konfirmasi (ack) hanya untuk admin." />
      ) : items.map((a) => {
        const s = LEVEL_STYLE[a.level];
        return (
          <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`${a.levelLabel}: ${a.judul}`}
            onPress={() => router.navigate({ pathname: '/detail-peringatan', params: { id: a.id } })}>
            <Card style={{ padding: 16, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: s.bg, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
                  <s.Icon size={16} color={s.fg} />
                  <Text v="status" style={{ color: s.fg, fontWeight: '700' }}>{a.levelLabel}</Text>
                </View>
                <Text v="meta">{a.waktu}</Text>
              </View>
              <Text v="bodyStrong">{a.judul}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text v="meta" style={{ flex: 1 }}>{a.sumber}</Text>
                <ChevronRight size={20} color={colors.textSecondary} />
              </View>
            </Card>
          </Pressable>
        );
      })}
      {items.length ? (
        <View style={{ height: 48, borderRadius: radius.input, backgroundColor: colors.surfaceSoft, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 }}>
          <Send size={20} color={colors.textSecondary} />
          <Text v="body">Lapor ke pengelola (DITUNDA)</Text>
        </View>
      ) : null}
    </Screen>
  );
}
