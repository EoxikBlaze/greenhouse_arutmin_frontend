import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { colors, radius } from '@/theme/tokens';
import { Text } from '@/ui/Text';

export interface Option { id: number; label: string }

// Pemilih dengan tampilan "Input" .pen; pilihan terbuka di bawah kolom.
export function OptionPicker({ label, placeholder, options, value, onChange, emptyText }: {
  label: string; placeholder: string; options: Option[]; value: number | null; onChange: (id: number) => void; emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.id === value);
  return (
    <View style={{ gap: 6 }}>
      <Text v="label">{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${chosen?.label ?? placeholder}`} accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)}
        style={{ height: 48, borderRadius: radius.input, paddingHorizontal: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text v="body" style={{ color: chosen ? colors.textPrimary : colors.textSecondary }}>{chosen?.label ?? placeholder}</Text>
        <ChevronDown size={20} color={colors.textSecondary} />
      </Pressable>
      {open ? (
        <View style={{ borderRadius: radius.input, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          {options.length === 0 ? <Text v="meta" style={{ padding: 14 }}>{emptyText}</Text> : options.map((o, i) => (
            <Pressable key={o.id} accessibilityRole="button" onPress={() => { onChange(o.id); setOpen(false); }}
              style={{ minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, backgroundColor: o.id === value ? colors.accentSoft : colors.surface }}>
              <Text v="body" style={{ color: colors.textPrimary }}>{o.label}</Text>
              {o.id === value ? <Check size={18} color={colors.accent} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
