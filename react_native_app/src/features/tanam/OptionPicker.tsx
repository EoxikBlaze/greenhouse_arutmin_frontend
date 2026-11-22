import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { radius, icon } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Text } from '@/ui/Text';

export interface Option { id: number; label: string }

// Pemilih dengan tampilan "Input" .pen; pilihan terbuka di bawah kolom.
export function OptionPicker({ label, placeholder, options, value, onChange, emptyText }: {
  label: string; placeholder: string; options: Option[]; value: number | null; onChange: (id: number) => void; emptyText: string;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.id === value);
  return (
    <View style={{ gap: 8 }}>
      <Text v="label">{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${chosen?.label ?? placeholder}`} accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)}
        style={{ minHeight: 48, borderRadius: radius.input, paddingHorizontal: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text v="body" style={{ color: chosen ? c.textPrimary : c.textSecondary }}>{chosen?.label ?? placeholder}</Text>
        <ChevronDown size={icon.md} color={c.textSecondary} />
      </Pressable>
      {open ? (
        <View style={{ borderRadius: radius.input, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
          {options.length === 0 ? <Text v="meta" style={{ padding: 16 }}>{emptyText}</Text> : options.map((o, i) => (
            <Pressable key={o.id} accessibilityRole="button" onPress={() => { onChange(o.id); setOpen(false); }}
              style={{ minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: i ? 1 : 0, borderTopColor: c.border, backgroundColor: o.id === value ? c.accentSoft : c.surface }}>
              <Text v="body" style={{ color: c.textPrimary }}>{o.label}</Text>
              {o.id === value ? <Check size={icon.md} color={c.accent} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
