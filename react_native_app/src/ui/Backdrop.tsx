import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { dark } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';

// Latar gradasi: dasar vertikal lembut + dua pendar cahaya (kiri atas, kanan bawah). Hanya dekorasi di belakang
// semua layar; warna dasarnya tetap bgScreen supaya kontras teks yang berdiri langsung di latar tidak berubah jauh.
const TERANG = { atas: '#D6F0FF', bawah: '#A9DBF4', pendar1: '#FFFFFF', pendar1A: 0.85, pendar2: '#CDF6E4', pendar2A: 0.6 };
const GELAP = { atas: '#10222E', bawah: '#0A151E', pendar1: '#1F6B66', pendar1A: 0.5, pendar2: '#1D4A6B', pendar2A: 0.45 };

export function Backdrop({ children }: { children: ReactNode }) {
  const c = useColors();
  const p = c === dark ? GELAP : TERANG;
  return (
    <View style={{ flex: 1, backgroundColor: c.bgScreen }}>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="dasar" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={p.atas} />
            <Stop offset="1" stopColor={p.bawah} />
          </LinearGradient>
          <RadialGradient id="pendar1" cx="0.1" cy="0" rx="0.9" ry="0.55" fx="0.1" fy="0">
            <Stop offset="0" stopColor={p.pendar1} stopOpacity={p.pendar1A} />
            <Stop offset="1" stopColor={p.pendar1} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="pendar2" cx="1" cy="1" rx="0.9" ry="0.5" fx="1" fy="1">
            <Stop offset="0" stopColor={p.pendar2} stopOpacity={p.pendar2A} />
            <Stop offset="1" stopColor={p.pendar2} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#dasar)" />
        <Rect width="100%" height="100%" fill="url(#pendar1)" />
        <Rect width="100%" height="100%" fill="url(#pendar2)" />
      </Svg>
      </View>
      {children}
    </View>
  );
}
