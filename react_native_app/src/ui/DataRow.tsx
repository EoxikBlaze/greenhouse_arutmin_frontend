import { View } from 'react-native';
import { colors, fonts } from '@/theme/tokens';
import { Text } from './Text';

// "Baris Data" .pen: label kiri, nilai tebal kanan, garis bawah border.
export function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text v="body" style={{ flex: 1 }}>{label}</Text>
      <Text v="bodyStrong" style={{ fontFamily: fonts.bodySemi, flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}
