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
    </Tabs>
  );
}
