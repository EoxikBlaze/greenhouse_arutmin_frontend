import { TextInput, TextInputProps, View } from 'react-native';
import { colors, fonts, radius } from '@/theme/tokens';
import { Text } from './Text';

export function Field({ label, ...p }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text v="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        {...p}
        style={{
          height: 48, borderRadius: radius.input, paddingHorizontal: 14,
          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
          fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary,
        }}
      />
    </View>
  );
}
