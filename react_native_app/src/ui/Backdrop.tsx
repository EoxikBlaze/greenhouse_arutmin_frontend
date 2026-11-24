import { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useColors } from '@/theme/useColors';

// Foto greenhouse (sudah diburamkan sedikit) di balik semua layar. Scrim warna latar menjaga
// kontras teks yang berdiri langsung di atas foto; melon tetap samar terlihat.
const SCRIM = { light: 0.42, dark: 0.64 };

export function Backdrop({ children }: { children: ReactNode }) {
  const c = useColors();
  const isDark = c.bgScreen === '#0D1B26';
  return (
    <View style={{ flex: 1, backgroundColor: c.bgScreen }}>
      <Image source={require('../../assets/images/bg-greenhouse.jpg')} resizeMode="cover" accessible={false} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.bgScreen, opacity: isDark ? SCRIM.dark : SCRIM.light }]} />
      {children}
    </View>
  );
}
