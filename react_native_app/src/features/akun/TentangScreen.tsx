import { useAuth } from '@/features/auth/AuthProvider';
import { Panel } from '@/ui/Panel';
import { DataRow } from '@/ui/DataRow';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

// Blur dan skala teks belum diterapkan di app ini, jadi ditampilkan sebagai informasi, bukan sakelar palsu.
export function TentangScreen() {
  const { user } = useAuth();
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  return (
    <Screen>
      <Header back="/akun" title="Tentang & tampilan" subtitle="Pengaturan perangkat" initials={initials} />
      <Panel gap={4}>
        <Text v="section">Tampilan</Text>
        <DataRow label="Blur latar belakang" value="Tidak dipakai" />
        <DataRow label="Mode warna" value="Ikuti sistem" />
        <DataRow label="Ukuran teks" value="Ikuti sistem" last />
      </Panel>
      <Panel gap={8}>
        <Text v="section">Tentang GARAP</Text>
        <Text v="body">GARAP Mobile · Vertonik Smart Farm. Notifikasi hanya muncul di ponsel ini saat aplikasi dibuka.</Text>
      </Panel>
    </Screen>
  );
}
