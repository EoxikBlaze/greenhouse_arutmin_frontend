import { Pressable, View } from 'react-native';
import { Text } from './Text';

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 23 }}>
      <Text v="section">{title}</Text>
      {action ? <Pressable onPress={onAction} hitSlop={10} accessibilityRole="link"><Text v="action">{action}</Text></Pressable> : null}
    </View>
  );
}
