import { ActivityIndicator, Pressable } from 'react-native';
import { colors, fonts, radius } from '@/theme/tokens';
import { Text } from './Text';

// secondary = "Tombol Sekunder" .pen (accent-soft, teks accent).
export function Button({ label, onPress, loading, disabled, variant = 'primary' }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'secondary' }) {
  const off = disabled || loading;
  const secondary = variant === 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 48, borderRadius: radius.input, paddingHorizontal: 20, gap: 8,
        alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
        backgroundColor: secondary ? colors.accentSoft : colors.accent, opacity: off ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      {loading && <ActivityIndicator color={secondary ? colors.accent : colors.onAccent} />}
      <Text v="bodyStrong" style={{ color: secondary ? colors.accent : colors.onAccent, fontFamily: fonts.bodySemi }}>{label}</Text>
    </Pressable>
  );
}
