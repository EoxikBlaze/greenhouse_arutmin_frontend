import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Send } from 'lucide-react-native';
import { ApiError } from '@/api/client';
import { api } from '@/api/session';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, fonts, radius, shadowDock } from '@/theme/tokens';
import { Banner } from '@/ui/Banner';
import { Card } from '@/ui/Card';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { parseAsisten } from './asistenView';

interface Msg { dariUser: boolean; teks: string }
const GREETING: Msg = { dariUser: false, teks: 'Halo, saya Asisten GARAP. Tanyakan kondisi kebun atau batch Anda.' };
const MAX = 500;

function Bubble({ m }: { m: Msg }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: m.dariUser ? 'flex-end' : 'flex-start' }}>
      <View style={{ maxWidth: '85%', padding: 14, borderRadius: radius.input, backgroundColor: m.dariUser ? colors.accentSoft : colors.surface, borderWidth: m.dariUser ? 0 : 1, borderColor: colors.border }}>
        <Text v="body" style={{ color: colors.textPrimary }}>{m.teks}</Text>
      </View>
    </View>
  );
}

export function AsistenScreen() {
  const { user, role } = useAuth();
  const demo = role === 'demo';
  const [msgs, setMsgs] = useState<Msg[]>(demo ? [{ dariUser: false, teks: 'Asisten belum tersedia untuk akun demo.' }] : [GREETING]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initials = (user?.username ?? '?').slice(0, 2).toUpperCase();

  async function send() {
    const t = text.trim();
    if (!t || busy || demo) return;
    const riwayat = msgs.slice(-8).map((m) => ({ peran: m.dariUser ? 'user' : 'ai', teks: m.teks }));
    setMsgs((x) => [...x, { dariUser: true, teks: t }]);
    setText('');
    setBusy(true);
    setError(null);
    try {
      const raw = await api.postText('/api/ai/chat', { pesan: t, riwayat });
      setMsgs((x) => [...x, { dariUser: false, teks: parseAsisten(raw).jawaban }]);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? 'Asisten belum tersedia di server ini.' : (e as Error).message);
    } finally { setBusy(false); }
  }

  const off = demo || busy || !text.trim();
  return (
    <Screen>
      <Header title="Asisten GARAP" subtitle={demo ? 'Demo · ditolak' : 'Tanya seputar kebun'} initials={initials} />
      {demo ? <Banner tone="danger" title="Asisten tidak tersedia" body="Akun demo belum bisa memakai asisten." /> : null}
      <Card style={[shadowDock, { padding: 16, gap: 12 }]}>
        {msgs.map((m, i) => <Bubble key={i} m={m} />)}
        {busy ? <Bubble m={{ dariUser: false, teks: 'Menulis jawaban…' }} /> : null}
      </Card>
      {error ? <Banner tone="danger" title="Asisten belum menjawab" body={error} /> : null}
      {demo ? null : <Text v="meta">Asisten hanya menjawab berdasarkan data kebun. Tidak ada kontrol perangkat dari sini.</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: demo ? 0.5 : 1 }}>
        <TextInput accessibilityLabel="Tulis pertanyaan" value={text} onChangeText={setText} editable={!demo} maxLength={MAX}
          placeholder="Tulis pertanyaan…" placeholderTextColor={colors.textSecondary} onSubmitEditing={send} returnKeyType="send"
          style={{ flex: 1, height: 48, borderRadius: radius.input, paddingHorizontal: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Kirim" disabled={off} onPress={send}
          style={{ width: 48, height: 48, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center', backgroundColor: off ? colors.border : colors.accent }}>
          <Send size={22} color={off ? colors.textSecondary : colors.onAccent} />
        </Pressable>
      </View>
    </Screen>
  );
}
