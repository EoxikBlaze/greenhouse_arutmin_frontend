import { useAuth } from '@/features/auth/AuthProvider';
import { TextSize, ThemeMode, usePrefs } from '@/theme/prefs';
import { Chips } from '@/ui/Chips';
import { Panel } from '@/ui/Panel';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const MODES: readonly { key: ThemeMode; label: string }[] = [{ key: 'system', label: 'Ikuti sistem' }, { key: 'light', label: 'Terang' }, { key: 'dark', label: 'Gelap' }];
const SIZES: readonly { key: TextSize; label: string }[] = [{ key: 'normal', label: 'Normal' }, { key: 'besar', label: 'Besar' }, { key: 'sangat-besar', label: 'Sangat besar' }];

export function TentangScreen() {
  const { user } = useAuth();
  const { mode, textSize, setMode, setTextSize } = usePrefs();
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();
  return (
    <Screen>
      <Header back="/akun" title="Tentang & tampilan" subtitle="Pengaturan perangkat" initials={initials} />
      <Panel gap={12}>
        <Text v="section">Tampilan</Text>
        <Text v="label">Mode warna</Text>
        <Chips options={MODES} value={mode} onChange={setMode} />
        <Text v="label">Ukuran teks</Text>
        <Chips options={SIZES} value={textSize} onChange={setTextSize} />
      </Panel>
      <Panel gap={8}>
        <Text v="section">Tentang GARAP</Text>
        <Text v="body">GARAP Mobile · Vertonik Smart Farm. Notifikasi hanya muncul di ponsel ini saat aplikasi dibuka.</Text>
      </Panel>
    </Screen>
  );
}
