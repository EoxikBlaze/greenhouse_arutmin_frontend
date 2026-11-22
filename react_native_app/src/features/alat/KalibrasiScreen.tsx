import { useAuth } from '@/features/auth/AuthProvider';
import { Banner } from '@/ui/Banner';
import { Panel } from '@/ui/Panel';
import { DataRow } from '@/ui/DataRow';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { AdminOnly } from './AdminOnly';

// Server ini tidak punya endpoint data kalibrasi, jadi semua baris memakai keadaan "tanpa data" dari desain.
export function KalibrasiScreen() {
  const { user } = useAuth();
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  return (
    <AdminOnly>
      <Screen>
        <Header back="/alat" title="Kalibrasi" subtitle="Versi 1 · hanya tampilan" initials={initials} />
        <Panel gap={12}>
          <Text v="section">Data kalibrasi (baca saja)</Text>
          <Text v="body">Kalibrasi hanya menampilkan data terakhir. Pengaturan ulang dilakukan petugas di perangkat.</Text>
          <DataRow label="Acuan pH 4,01" value="Belum ada data" />
          <DataRow label="Acuan pH 6,86" value="Belum ada data" />
          <DataRow label="Terakhir kalibrasi" value="Belum pernah" last />
        </Panel>
        <Banner tone="warn" title="Hanya untuk dilihat" body="Tidak ada tombol jalankan kalibrasi. Data hanya ditampilkan." />
      </Screen>
    </AdminOnly>
  );
}
