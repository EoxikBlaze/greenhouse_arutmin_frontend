import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/api/session';
import { useAuth } from '@/features/auth/AuthProvider';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { Field } from '@/ui/Field';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { validatePassword } from './akunView';

export function GantiSandiScreen() {
  const { user, logout } = useAuth();
  const [lama, setLama] = useState('');
  const [baru, setBaru] = useState('');
  const [ulang, setUlang] = useState('');
  const [local, setLocal] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: () => api.post('/profil/password', { password_lama: lama, password: baru, password_confirmation: ulang }),
    // Backend tidak mencabut token lama; sesuai desain pengguna diminta masuk kembali.
    onSuccess: () => logout(),
  });

  const submit = () => {
    const err = validatePassword({ lama, baru, ulang });
    setLocal(err);
    if (!err) m.mutate();
  };
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  return (
    <Screen>
      <Header back="/akun" title="Ganti kata sandi" subtitle="Setelah mengganti sandi, masuk kembali." initials={initials} />
      {local ? <Banner tone="danger" title="Periksa isian" body={local} /> : null}
      {m.isError ? <Banner tone="danger" title="Kata sandi belum diganti" body={(m.error as Error).message} /> : null}
      <Panel gap={12}>
        <Field label="Kata sandi lama" secureTextEntry value={lama} onChangeText={setLama} autoCapitalize="none" autoComplete="current-password" />
        <Field label="Kata sandi baru" secureTextEntry value={baru} onChangeText={setBaru} autoCapitalize="none" autoComplete="new-password" />
        <Field label="Ulangi kata sandi baru" secureTextEntry value={ulang} onChangeText={setUlang} autoCapitalize="none" autoComplete="new-password" />
      </Panel>
      <Text v="metaOnBg">Setelah kata sandi diganti, Anda perlu masuk kembali.</Text>
      <Button label="Simpan kata sandi" loading={m.isPending} onPress={submit} />
    </Screen>
  );
}
