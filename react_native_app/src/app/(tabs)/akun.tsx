import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { SectionTitle } from '@/ui/SectionTitle';
import { Text } from '@/ui/Text';

// Sementara: identitas + keluar. Layar Akun lengkap (S60–S62) dibangun di irisan 6.
export default function Akun() {
  const { user, logout } = useAuth();
  return (
    <Screen>
      <SectionTitle title="Akun" />
      <Card style={{ gap: 4 }}>
        <Text v="bodyStrong">{user?.username}</Text>
        <Text v="meta">{user?.email ?? user?.level}</Text>
      </Card>
      <Button label="Keluar" onPress={logout} />
    </Screen>
  );
}
