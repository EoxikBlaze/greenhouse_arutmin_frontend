import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { fontAssets } from '@/theme/fonts';
import { Backdrop } from '@/ui/Backdrop';
import { PrefsProvider } from '@/theme/prefs';
import { dark } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Warna status bar mengikuti tema terpilih, bukan hanya tema sistem.
function Bar() {
  return <StatusBar style={useColors() === dark ? 'light' : 'dark'} />;
}

function Gate() {
  const c = useColors();
  const { ready } = useAuth();
  if (!ready) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bgScreen }}><ActivityIndicator accessibilityLabel="Memuat" color={c.accent} /></View>;
  }
  return <Backdrop><Slot /></Backdrop>;
}

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts(fontAssets);
  const fontsDone = fontsLoaded || !!fontsError;
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000 } } }));
  useEffect(() => { if (fontsDone) SplashScreen.hideAsync().catch(() => {}); }, [fontsDone]);
  if (!fontsDone) return null;
  return (
    <SafeAreaProvider>
      <PrefsProvider>
        <QueryClientProvider client={qc}>
          <AuthProvider>
            <Bar />
            <Gate />
          </AuthProvider>
        </QueryClientProvider>
      </PrefsProvider>
    </SafeAreaProvider>
  );
}
