import { TextInput, TextInputProps, View } from 'react-native';
import { fonts, radius } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Text } from './Text';

export function Field({ label, ...p }: TextInputProps & { label: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      <Text v="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.textSecondary}
        {...p}
        style={{
          minHeight: 48, borderRadius: radius.input, paddingHorizontal: 16,
          backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
          fontFamily: fonts.body, fontSize: 16, color: c.textPrimary,
        }}
      />
    </View>
  );
}
