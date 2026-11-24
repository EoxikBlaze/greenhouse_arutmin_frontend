import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { CircleAlert, CircleCheck, CircleHelp, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { api } from '@/api/session';
import { ApiError } from '@/api/client';
import { tanggalId } from '@/features/tanam/tanamView';
import { useColors } from '@/theme/useColors';
import { Button } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { SectionTitle } from '@/ui/SectionTitle';
import { Skeleton } from '@/ui/Skeleton';
import { StatusChip } from '@/ui/StatusChip';
import { Text } from '@/ui/Text';
import { SENSOR_LABEL, STATUS_PRED_LABEL, STATUS_SARAN_LABEL, parsePrediksi, parseSaran, sisaHari, type StatusPrediksi, type StatusSaran } from './analitikView';

type Tone = 'ok' | 'warn' | 'danger' | 'info';
const PRED: Record<StatusPrediksi, { tone: Tone; Icon: LucideIcon }> = { sesuai: { tone: 'ok', Icon: CircleCheck }, segera: { tone: 'warn', Icon: CircleAlert }, terlambat: { tone: 'danger', Icon: TriangleAlert } };
const SARAN: Record<StatusSaran, { tone: Tone; Icon: LucideIcon }> = { aman: { tone: 'ok', Icon: CircleCheck }, perhatian: { tone: 'warn', Icon: CircleAlert }, di_luar: { tone: 'danger', Icon: TriangleAlert }, data_kurang: { tone: 'info', Icon: CircleHelp } };
const TAHAP = { semai: 'Semai', peremajaan: 'Peremajaan', pendewasaan: 'Pendewasaan' } as const;
const MAKS = 5;

// Server tanpa endpoint analitik (404): kartu tidak tampil sama sekali, bukan pesan galat di Beranda.
const hilang = (e: unknown) => e instanceof ApiError && e.status === 404;

export function PrediksiPanen() {
  const c = useColors();
  const q = useQuery({ queryKey: ['analitik', 'prediksi'], queryFn: async () => parsePrediksi(await api.get('/api/analitik/prediksi-panen')), retry: false });
  if (q.isError && hilang(q.error)) return null;
  const list = q.data?.list ?? [];
  return (
    <>
      <SectionTitle title="Perkiraan panen" />
      <Panel gap={12}>
        {q.isPending ? <Skeleton /> : q.isError ? (
          <>
            <Text v="body">{(q.error as Error).message}</Text>
            <Button variant="secondary" label="Coba lagi" onPress={() => q.refetch()} />
          </>
        ) : list.length === 0 ? <Text v="body">Belum ada batch yang sedang berjalan.</Text> : (
          list.slice(0, MAKS).map((r, i) => {
            const s = r.prediksi ? PRED[r.prediksi.status] : null;
            return (
              <View key={`${r.tipe}-${r.id}`} style={{ gap: 4, paddingTop: i ? 12 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Text v="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{r.varietas ?? 'Tanaman'}</Text>
                  {r.prediksi && s ? <StatusChip label={STATUS_PRED_LABEL[r.prediksi.status]} tone={s.tone} Icon={s.Icon} /> : null}
                </View>
                <Text v="meta">{`${TAHAP[r.tipe]} · ${r.meja ?? 'Tanpa meja'}`}</Text>
                <Text v="meta">
                  {r.prediksi ? `Panen ${tanggalId(`${r.prediksi.tgl_prediksi}T00:00:00`) ?? r.prediksi.tgl_prediksi} · ${sisaHari(r.prediksi.sisa_hari)}` : 'Durasi siklus belum diatur'}
                </Text>
              </View>
            );
          })
        )}
        {list.length > MAKS ? <Text v="caption">{`${MAKS} dari ${list.length} batch`}</Text> : null}
      </Panel>
    </>
  );
}

export function SaranDosis() {
  const c = useColors();
  const q = useQuery({ queryKey: ['analitik', 'saran'], queryFn: async () => parseSaran(await api.get('/api/analitik/saran-dosis?jam=6')), retry: false });
  if (q.isError && hilang(q.error)) return null;
  const d = q.data;
  return (
    <>
      <SectionTitle title="Saran nutrisi" />
      <Panel gap={12}>
        {q.isPending ? <Skeleton /> : q.isError ? (
          <>
            <Text v="body">{(q.error as Error).message}</Text>
            <Button variant="secondary" label="Coba lagi" onPress={() => q.refetch()} />
          </>
        ) : !d || d.saran.length === 0 ? <Text v="body">Belum ada saran untuk saat ini.</Text> : (
          <>
            <Text v="caption">{`${d.jumlahBacaan} bacaan · ${d.jendelaJam} jam terakhir`}</Text>
            {d.saran.map((s, i) => {
              const t = SARAN[s.status];
              return (
                <View key={s.sensor} style={{ gap: 4, paddingTop: i ? 12 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <Text v="bodyStrong" style={{ flex: 1 }}>{SENSOR_LABEL[s.sensor]}{s.nilai !== undefined ? ` · ${String(s.nilai).replace('.', ',')}` : ''}</Text>
                    <StatusChip label={STATUS_SARAN_LABEL[s.status]} tone={t.tone} Icon={t.Icon} />
                  </View>
                  <Text v="body">{s.saran}</Text>
                  {s.perkiraan_jam_ke_batas !== undefined ? <Text v="meta">{`Perkiraan mencapai batas dalam ±${s.perkiraan_jam_ke_batas} jam.`}</Text> : null}
                </View>
              );
            })}
            {d.catatan ? <Text v="caption">{d.catatan}</Text> : null}
          </>
        )}
      </Panel>
    </>
  );
}
