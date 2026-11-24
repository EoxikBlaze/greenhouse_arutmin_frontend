import { Pressable, View } from 'react-native';
import { Text } from './Text';

// Judul bagian merapat ke isinya: ruang di atas lebih lega daripada di bawah (gap layar 16 dikurangi 6).
export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 23, marginTop: 6, marginBottom: -6 }}>
      <Text v="section" accessibilityRole="header">{title}</Text>
      {action ? <Pressable onPress={onAction} hitSlop={12} accessibilityRole="link"><Text v="action">{action}</Text></Pressable> : null}
    </View>
  );
}
