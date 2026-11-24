import { Pressable, View } from 'react-native';
import { fonts, radius } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Text } from './Text';

// Pilihan satu-dari-banyak (periode, kategori, jenis grafik): tinggi 44, aktif = isi accent.
export function Chips<K extends string>({ options, value, onChange }: { options: readonly { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const c = useColors();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.key)}
            style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: radius.input, justifyContent: 'center', backgroundColor: on ? c.accent : c.surface, borderWidth: on ? 0 : 1, borderColor: c.border }}>
            <Text v="label" style={{ color: on ? c.onAccent : c.textSecondary, fontFamily: fonts.bodySemi }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
