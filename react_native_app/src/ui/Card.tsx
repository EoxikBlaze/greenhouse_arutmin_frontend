import { View, ViewProps } from 'react-native';
import { radius, shadowCard } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';

export function Card({ style, ...p }: ViewProps) {
  const c = useColors();
  return <View {...p} style={[{ backgroundColor: c.surface, borderRadius: radius.card, padding: 16 }, shadowCard, style]} />;
}
