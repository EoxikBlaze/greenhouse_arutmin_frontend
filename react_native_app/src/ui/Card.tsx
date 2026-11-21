import { View, ViewProps } from 'react-native';
import { colors, radius, shadowCard } from '@/theme/tokens';

export function Card({ style, ...p }: ViewProps) {
  return <View {...p} style={[{ backgroundColor: colors.surface, borderRadius: radius.card, padding: 14 }, shadowCard, style]} />;
}
