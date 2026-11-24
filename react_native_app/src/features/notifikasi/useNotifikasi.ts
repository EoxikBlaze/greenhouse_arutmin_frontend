import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/api/session';
import { loadAlerts } from '@/features/peringatan/alertView';
import { analisisPerluNotif, saringAlertBaru, teksAlert } from './notifView';
import { parseLaporan } from '@/features/asisten/analisisView';

const KANAL = 'garap_peringatan';
const KUNCI_ANALISIS = 'garap.analisis_dinotif';
const INTERVAL_MS = 60_000;

// shortcut: memeriksa server berkala selama app hidup (juga di latar belakang sampai sistem menghentikannya).
// Push saat app tertutup penuh butuh FCM/APNs dan akses internet dari Pi; tambahkan bila greenhouse sudah online.
export function useNotifikasi(aktif: boolean) {
  const idTerakhir = useRef<number | null>(null);
  const tanggal = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!aktif || Platform.OS === 'web') return;
    let batal = false;
    let boleh = false;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    });

    const kirim = (title: string, body: string) =>
      Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: Platform.OS === 'android' ? { channelId: KANAL } : null });

    async function periksa() {
      try {
        const { rows } = await loadAlerts(api);
        const h = saringAlertBaru(rows, idTerakhir.current);
        idTerakhir.current = h.idTerakhir;
        if (boleh) for (const r of h.baru.slice(0, 3)) { const t = teksAlert(r); await kirim(t.judul, t.isi); }
      } catch { /* jaringan/izin: dicoba lagi pada pemeriksaan berikutnya */ }
      try {
        if (tanggal.current === undefined) tanggal.current = await SecureStore.getItemAsync(KUNCI_ANALISIS);
        const lap = parseLaporan(await api.get('/api/ai/analisis-harian/terbaru'));
        const t = analisisPerluNotif(lap, tanggal.current);
        if (t && lap && boleh) {
          await kirim(lap.isi.judul || 'Analisis harian', lap.isi.ringkasan_utama || 'Laporan analisis harian sudah siap.');
          tanggal.current = t;
          await SecureStore.setItemAsync(KUNCI_ANALISIS, t);
        }
      } catch { /* demo (403) atau server tanpa endpoint: lewati */ }
    }

    (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync(KANAL, { name: 'Peringatan greenhouse', description: 'pH/TDS di luar batas, air habis, alat offline', importance: Notifications.AndroidImportance.HIGH });
        }
        const ada = await Notifications.getPermissionsAsync();
        boleh = ada.granted || (ada.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
      } catch { boleh = false; }
      if (!batal) void periksa();
    })();

    const timer = setInterval(() => { if (AppState.currentState === 'active' || boleh) void periksa(); }, INTERVAL_MS);
    return () => { batal = true; clearInterval(timer); };
  }, [aktif]);
}
