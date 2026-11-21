import { Inbox, type LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Card } from './Card';
import { Text } from './Text';

export function EmptyState({ title, body, Icon = Inbox }: { title: string; body: string; Icon?: LucideIcon }) {
  return (
    <Card style={{ padding: 24, gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
      <Icon size={32} color={colors.textSecondary} />
      <Text v="section">{title}</Text>
      <Text v="body" style={{ textAlign: 'center' }}>{body}</Text>
    </Card>
  );
}
