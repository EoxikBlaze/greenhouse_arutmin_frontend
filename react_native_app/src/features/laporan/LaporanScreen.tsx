import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Platform, Share, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { api } from '@/api/session';
import { useAuth } from '@/features/auth/AuthProvider';
import { AdminOnly } from '@/features/alat/AdminOnly';
import { useColors } from '@/theme/useColors';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { DataRow } from '@/ui/DataRow';
import { Chips } from '@/ui/Chips';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Skeleton } from '@/ui/Skeleton';
import { Text } from '@/ui/Text';
import { RentangKey, csvLaporan, htmlLaporan, parseMatriks, rentang } from './laporan';

const OPSI: { key: RentangKey; label: string }[] = [{ key: '7', label: '7 hari' }, { key: '30', label: '30 hari' }, { key: 'semua', label: 'Semua' }];
const fmt = (n: number, d = 1) => n.toFixed(d).replace('.', ',');

export function LaporanScreen() {
  const c = useColors();
  const { user } = useAuth();
  const [key, setKey] = useState<RentangKey>('30');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ['laporan', key],
    queryFn: async () => {
      const qs = new URLSearchParams(rentang(key) as Record<string, string>).toString();
      return parseMatriks(await api.get(`/laporan${qs ? `?${qs}` : ''}`));
    },
  });
  const rows = q.data ?? [];
  const label = OPSI.find((o) => o.key === key)!.label;
  const phs = rows.map((r) => r.rataPh).filter((v): v is number => v != null);
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  async function pdf() {
    setBusy(true); setMsg(null);
    try {
      const html = htmlLaporan(rows, label);
      if (Platform.OS === 'web') await Print.printAsync({ html });
      else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Laporan GARAP' });
        else setMsg('Berbagi file tidak tersedia di perangkat ini.');
      }
    } catch (e) { setMsg((e as Error).message || 'PDF belum bisa dibuat.'); }
    finally { setBusy(false); }
  }
  async function csv() {
    setMsg(null);
    try { await Share.share({ message: csvLaporan(rows), title: 'laporan-garap.csv' }); }
    catch (e) { setMsg((e as Error).message); }
  }

  return (
    <AdminOnly>
      <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
        <Header back="/alat" title="Laporan" subtitle="Admin · ringkasan kebun" initials={initials} />
        <Chips options={OPSI} value={key} onChange={setKey} />
        {q.isError ? <Banner tone="danger" title="Laporan belum bisa dimuat" body={(q.error as Error).message} /> : null}
        {msg ? <Banner tone="danger" title="Gagal" body={msg} /> : null}
        {q.isPending ? <Skeleton /> : (
          <>
            <Panel gap={8}>
              <Text v="section">Ringkasan</Text>
              {rows.length === 0 ? <Text v="meta">Belum ada data pada periode ini.</Text> : (
                <>
                  <DataRow label="Semai dimulai" value={String(rows.reduce((a, r) => a + r.semai, 0))} />
                  <DataRow label="Panen (kg)" value={fmt(rows.reduce((a, r) => a + r.panenKg, 0))} />
                  <DataRow label="Rata-rata pH" value={phs.length ? fmt(phs.reduce((a, b) => a + b, 0) / phs.length, 2) : '—'} last />
                </>
              )}
            </Panel>
            {rows.length ? (
              <Panel gap={8}>
                <Text v="section">Per bulan</Text>
                {rows.map((r, i) => <DataRow key={r.periode} last={i === rows.length - 1} label={r.periode} value={`Panen ${fmt(r.panenKg)} kg · pH ${r.rataPh == null ? '—' : fmt(r.rataPh, 2)}`} />)}
              </Panel>
            ) : null}
          </>
        )}
        <Button label="Bagikan PDF" loading={busy} disabled={rows.length === 0} onPress={pdf} />
        <Button variant="secondary" label="Ekspor CSV" disabled={rows.length === 0} onPress={csv} />
      </Screen>
    </AdminOnly>
  );
}
