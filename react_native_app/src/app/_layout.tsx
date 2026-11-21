import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { fontAssets } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

function Gate() {
  const { ready } = useAuth();
  if (!ready) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgScreen }}><ActivityIndicator color={colors.accent} /></View>;
  }
  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000 } } }));
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <StatusBar style="dark" />
          <Gate />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
