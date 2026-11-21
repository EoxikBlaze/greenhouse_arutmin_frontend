import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useAuth } from '@/features/auth/AuthProvider';
import { Dock } from '@/ui/Dock';

// Peta Alur: Admin = Beranda·Tanam·Alat·Peringatan·Akun; Petani/Demo tanpa Alat.
export default function TabsLayout() {
  const { user, role } = useAuth();
  if (!user) return <Redirect href="/login" />;
  return (
    <Tabs tabBar={(p: any) => <Dock {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}>
      <Tabs.Screen name="index" options={{ title: 'Beranda' }} />
      <Tabs.Screen name="tanam" options={{ title: 'Tanam' }} />
      <Tabs.Screen name="alat" options={{ title: 'Alat', href: role === 'admin' ? undefined : null }} />
      <Tabs.Screen name="peringatan" options={{ title: 'Peringatan' }} />
      <Tabs.Screen name="akun" options={{ title: 'Akun' }} />
      <Tabs.Screen name="sensor" options={{ title: 'Detail sensor' }} />
      <Tabs.Screen name="grafik" options={{ title: 'Grafik & riwayat' }} />
      <Tabs.Screen name="batch" options={{ title: 'Detail batch' }} />
      <Tabs.Screen name="mulai-semai" options={{ title: 'Mulai semai' }} />
      <Tabs.Screen name="konfirmasi" options={{ title: 'Konfirmasi' }} />
      <Tabs.Screen name="detail-peringatan" options={{ title: 'Detail peringatan' }} />
      <Tabs.Screen name="saklar" options={{ title: 'Saklar' }} />
      <Tabs.Screen name="kalibrasi" options={{ title: 'Kalibrasi' }} />
      <Tabs.Screen name="konfirmasi-perangkat" options={{ title: 'Konfirmasi perintah' }} />
      <Tabs.Screen name="ganti-sandi" options={{ title: 'Ganti kata sandi' }} />
      <Tabs.Screen name="tentang" options={{ title: 'Tentang' }} />
      <Tabs.Screen name="asisten" options={{ title: 'Asisten' }} />
      <Tabs.Screen name="uji-lab" options={{ title: 'Uji lab' }} />
      <Tabs.Screen name="laporan" options={{ title: 'Laporan' }} />
      <Tabs.Screen name="cctv" options={{ title: 'CCTV' }} />
    </Tabs>
  );
}
