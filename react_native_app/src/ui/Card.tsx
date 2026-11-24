import { StyleSheet, View, ViewProps } from 'react-native';
import { radius } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';

// Permukaan datar: garis tepi tipis, tanpa bayangan. Hanya yang benar-benar melayang (dock) berbayang.
export function Card({ style, ...p }: ViewProps) {
  const c = useColors();
  return <View {...p} style={[{ backgroundColor: c.surface, borderRadius: radius.card, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: `${c.border}B3` }, style]} />;
}
