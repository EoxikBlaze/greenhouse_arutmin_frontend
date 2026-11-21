import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/AuthProvider';
import { ApiError } from '@/api/client';
import { colors, space } from '@/theme/tokens';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Text } from '@/ui/Text';

export default function Login() {
  const { user, login } = useAuth();
  const { top, bottom } = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Redirect href="/" />;

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await login(username, password, remember);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Terjadi kesalahan. Coba lagi.');
    } finally { setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bgScreen }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: top + 20, paddingBottom: bottom + 24, paddingHorizontal: space.screen, gap: 16 }}>
        <Text v="wordmark" style={{ fontSize: 20 }}>Vertonik · GARAP</Text>
        <Text v="title">Masuk ke GARAP</Text>
        <Text v="body">Pantau greenhouse Vertonik dari ponsel.</Text>
        <Field label="Nama pengguna" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} textContentType="username" />
        <Field label="Kata sandi" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" onSubmitEditing={submit} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
          <Switch value={remember} onValueChange={setRemember} trackColor={{ true: colors.accent, false: colors.border }} thumbColor="#FFFFFF" accessibilityLabel="Ingat saya" />
          <Text v="body" style={{ color: colors.textPrimary, flex: 1 }}>Ingat saya</Text>
        </View>
        {error ? <Banner tone="danger" title="Gagal masuk" body={error} /> : null}
        <Button label="Masuk" onPress={submit} loading={busy} disabled={!username.trim() || !password} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
