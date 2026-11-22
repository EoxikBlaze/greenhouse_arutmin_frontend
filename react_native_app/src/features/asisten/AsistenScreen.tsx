import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Send } from 'lucide-react-native';
import { ApiError } from '@/api/client';
import { api } from '@/api/session';
import { useAuth } from '@/features/auth/AuthProvider';
import { fonts, radius, icon } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';
import { Banner } from '@/ui/Banner';
import { Panel } from '@/ui/Panel';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { parseAsisten } from './asistenView';

interface Msg { dariUser: boolean; teks: string }
const GREETING: Msg = { dariUser: false, teks: 'Halo, saya Asisten GARAP. Tanyakan kondisi kebun atau batch Anda.' };
const MAX = 500;

function Bubble({ m }: { m: Msg }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: m.dariUser ? 'flex-end' : 'flex-start' }}>
      <View style={{ maxWidth: '85%', padding: 16, borderRadius: radius.input, backgroundColor: m.dariUser ? c.accentSoft : c.surface, borderWidth: m.dariUser ? 0 : 1, borderColor: c.border }}>
        <Text v="body" style={{ color: c.textPrimary }}>{m.teks}</Text>
      </View>
    </View>
  );
}

export function AsistenScreen() {
  const c = useColors();
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
      <Header back="/" title="Asisten GARAP" subtitle={demo ? 'Demo · ditolak' : 'Tanya seputar kebun'} initials={initials} />
      {demo ? <Banner tone="danger" title="Asisten tidak tersedia" body="Akun demo belum bisa memakai asisten." /> : null}
      <Panel gap={12}>
        {msgs.map((m, i) => <Bubble key={i} m={m} />)}
        {busy ? <Bubble m={{ dariUser: false, teks: 'Menulis jawaban…' }} /> : null}
      </Panel>
      {error ? <Banner tone="danger" title="Asisten belum menjawab" body={error} /> : null}
      {demo ? null : <Text v="metaOnBg">Asisten hanya menjawab berdasarkan data kebun. Tidak ada kontrol perangkat dari sini.</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: demo ? 0.5 : 1 }}>
        <TextInput accessibilityLabel="Tulis pertanyaan" value={text} onChangeText={setText} editable={!demo} maxLength={MAX}
          placeholder="Tulis pertanyaan…" placeholderTextColor={c.textSecondary} onSubmitEditing={send} returnKeyType="send"
          style={{ flex: 1, height: 48, borderRadius: radius.input, paddingHorizontal: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, fontFamily: fonts.body, fontSize: 16, color: c.textPrimary }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Kirim" disabled={off} onPress={send}
          style={{ width: 48, height: 48, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center', backgroundColor: off ? c.border : c.accent }}>
          <Send size={icon.lg} color={off ? c.textSecondary : c.onAccent} />
        </Pressable>
      </View>
    </Screen>
  );
}
