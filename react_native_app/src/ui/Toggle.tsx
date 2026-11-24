import { Pressable, View } from 'react-native';
import { useColors } from '@/theme/useColors';

// Saklar .pen 52x32; area ketuk diperluas ke 44 tinggi. Mati = rel `control` (kontras >= 3:1).
export function Toggle({ value, onChange, disabled, label }: { value: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label?: string }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled} hitSlop={6} onPress={() => onChange?.(!value)}
      style={{ width: 52, height: 32, borderRadius: 16, padding: 4, justifyContent: 'center', alignItems: value ? 'flex-end' : 'flex-start', backgroundColor: value ? c.accent : c.control, opacity: disabled ? 0.6 : 1 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.surface }} />
    </Pressable>
  );
}
