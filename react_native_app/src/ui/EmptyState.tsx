import { Inbox, type LucideIcon } from 'lucide-react-native';
import { icon } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Card } from './Card';
import { Text } from './Text';

// flat = di dalam Panel lain (tanpa bayangan, agar tidak kartu-dalam-kartu).
export function EmptyState({ title, body, Icon = Inbox, flat }: { title: string; body: string; Icon?: LucideIcon; flat?: boolean }) {
  const c = useColors();
  return (
    <Card style={[{ padding: 24, gap: 12, alignItems: 'center', justifyContent: 'center', minHeight: 180 }, flat && { backgroundColor: c.surfaceSoft, shadowOpacity: 0, elevation: 0 }]}>
      <Icon size={icon.xl} color={c.textSecondary} />
      <Text v="section">{title}</Text>
      <Text v="body" style={{ textAlign: 'center' }}>{body}</Text>
    </Card>
  );
}
