import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { router } from 'expo-router';
import { api } from '@/api/session';
import type { User } from '@/api/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Header } from '@/ui/Header';
import { Panel } from '@/ui/Panel';
import { Screen } from '@/ui/Screen';
import { validateProfile } from './akunView';

export function UbahProfilScreen() {
  const { user, role, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [local, setLocal] = useState<string | null>(null);
  const demo = role === 'demo';

  const m = useMutation({
    mutationFn: () => api.post<{ user?: User }>('/profil/update', { username: username.trim(), email: email.trim() }),
    onSuccess: async (r) => {
      // Server menormalkan username (huruf kecil); pakai nilai balikannya, bukan isian.
      await updateUser({ ...user!, ...(r?.user ?? { username: username.trim().toLowerCase(), email: email.trim() }) });
      router.navigate('/akun');
    },
  });

  const submit = () => {
    const err = validateProfile({ username, email });
    setLocal(err);
    if (!err) m.mutate();
  };
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  return (
    <Screen>
      <Header back="/akun" title="Ubah profil" subtitle="Nama dan email akun ini" initials={initials} />
      {demo ? <Banner tone="info" title="Mode demo" body="Akun demo tidak bisa mengubah profil." /> : null}
      {local ? <Banner tone="danger" title="Periksa isian" body={local} /> : null}
      {m.isError ? <Banner tone="danger" title="Profil belum tersimpan" body={(m.error as Error).message} /> : null}
      <Panel gap={12}>
        <Field label="Nama pengguna" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username" editable={!demo} />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" editable={!demo} />
      </Panel>
      <Button label="Simpan perubahan" loading={m.isPending} disabled={demo} onPress={submit} />
    </Screen>
  );
}
