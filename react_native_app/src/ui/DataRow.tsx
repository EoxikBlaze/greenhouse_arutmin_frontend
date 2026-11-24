import { View } from 'react-native';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Text } from './Text';

// "Baris Data" .pen: label kiri, nilai tebal kanan, garis bawah border (tidak untuk baris terakhir).
export function DataRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 48, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border }}>
      <Text v="body" style={{ flex: 1 }}>{label}</Text>
      <Text v="bodyStrong" style={{ fontFamily: fonts.bodySemi, flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}
