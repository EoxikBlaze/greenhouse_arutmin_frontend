import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { RequireAuth } from './components/RequireAuth'
import LoginPage from './pages/LoginPage'
import {
  DashboardPage,
  SensorRealtimePage,
  KebunSayaPage,
  CctvPage,
  AsistenAiPage,
  DosingPage,
  KalibrasiPage,
  NutrisiManualPage,
  DataPage,
  AuditPage,
  MqttDiagnostikPage,
  PemulihanPapanPage,
  PengaturanAlatPage,
  PeringatanPage,
  SaklarModePage,
  SemaiPage,
  PeremajaanPage,
  PendewasaanPage,
  PanenPage,
  JenisTanamanPage,
  MejaTanamanPage,
  AmbangSensorPage,
  LaporanPage,
  ManajemenUserPage,
  ProfilePage,
} from './halaman'
import TentangPage from './pages/TentangPage'
import { GalatHalaman } from './components/GalatHalaman'

/** Guard gaya .pen — semua role yang boleh masuk */
const ALL: Array<'admin' | 'petani' | 'demo'> = ['admin', 'petani', 'demo']
/** admin + demo (demo = read-only) */
const ADMIN_DEMO: Array<'admin' | 'demo'> = ['admin', 'demo']

export const router = createBrowserRouter([
  {
    errorElement: <GalatHalaman />,
    children: [
  // Landing page publik (dulu halaman Tentang). Login lewat tombol "Login".
  { path: '/', element: <TentangPage /> },
  { path: '/login', element: <LoginPage /> },
  // Halaman publik — bisa dibuka TANPA login (di luar RequireAuth), seperti /login.
  { path: '/tentang', element: <Navigate to="/" replace /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          // 00/01 · semua role
          { path: '/dashboard', element: <RequireAuth allow={ALL} element={<DashboardPage />} /> },
          { path: '/sensor', element: <Navigate to="/sensor-realtime" replace /> },
          { path: '/telemetri', element: <Navigate to="/sensor-realtime" replace /> },
          { path: '/sensor-realtime', element: <RequireAuth allow={ALL} element={<SensorRealtimePage />} /> },
          { path: '/peringatan', element: <RequireAuth allow={ALL} element={<PeringatanPage />} /> },
          { path: '/tanam', element: <RequireAuth allow={ALL} element={<KebunSayaPage />} /> },
          { path: '/cctv', element: <RequireAuth allow={ALL} element={<CctvPage />} /> },
          { path: '/asisten-ai', element: <RequireAuth allow={ALL} element={<AsistenAiPage />} /> },
          { path: '/profil', element: <RequireAuth allow={ALL} element={<ProfilePage />} /> },
          { path: '/dosing', element: <RequireAuth allow={ADMIN_DEMO} element={<DosingPage />} /> },
          { path: '/kalibrasi', element: <RequireAuth allow={ADMIN_DEMO} element={<KalibrasiPage />} /> },

          // Halaman mandiri IoT Hidroponik 1 Penampung v4.1 (sesuai menu sidebar Hidro Control)
          { path: '/saklar', element: <RequireAuth allow={ADMIN_DEMO} element={<SaklarModePage />} /> },
          { path: '/dosing-manual', element: <RequireAuth allow={ADMIN_DEMO} element={<NutrisiManualPage />} /> },
          { path: '/pompa', element: <Navigate to="/dosing-manual" replace /> },
          { path: '/kuras-air', element: <Navigate to="/dashboard" replace /> },
          { path: '/air', element: <Navigate to="/dashboard" replace /> },
          { path: '/watercontrol', element: <Navigate to="/dashboard" replace /> },
          { path: '/data', element: <RequireAuth allow={ADMIN_DEMO} element={<DataPage />} /> },
          { path: '/ujilab', element: <Navigate to="/data" replace /> },
          { path: '/pengaturan-alat', element: <RequireAuth allow={ADMIN_DEMO} element={<PengaturanAlatPage />} /> },
          { path: '/pengaturan', element: <Navigate to="/pengaturan-alat" replace /> },
          { path: '/pemulihan-papan', element: <RequireAuth allow={ADMIN_DEMO} element={<PemulihanPapanPage />} /> },
          { path: '/pulihkan', element: <Navigate to="/pemulihan-papan" replace /> },
          { path: '/mqtt-diagnostik', element: <RequireAuth allow={ADMIN_DEMO} element={<MqttDiagnostikPage />} /> },
          { path: '/mqtt', element: <Navigate to="/mqtt-diagnostik" replace /> },
          { path: '/log', element: <Navigate to="/audit" replace /> },

          // 02 · Kebun & Sensor — admin (demo read-only)

          // 03 · Data Tahap + Durasi Siklus — admin (demo read-only)
          { path: '/semai', element: <RequireAuth allow={ADMIN_DEMO} element={<SemaiPage />} /> },
          { path: '/peremajaan', element: <RequireAuth allow={ADMIN_DEMO} element={<PeremajaanPage />} /> },
          { path: '/pendewasaan', element: <RequireAuth allow={ADMIN_DEMO} element={<PendewasaanPage />} /> },
          { path: '/panen', element: <RequireAuth allow={ADMIN_DEMO} element={<PanenPage />} /> },
          { path: '/siklus', element: <Navigate to="/dosing" replace /> },

          // 04 · Master Data — admin (demo read-only)
          { path: '/tanaman', element: <RequireAuth allow={ADMIN_DEMO} element={<JenisTanamanPage />} /> },
          { path: '/meja', element: <RequireAuth allow={ADMIN_DEMO} element={<MejaTanamanPage />} /> },
          { path: '/ambang', element: <RequireAuth allow={ADMIN_DEMO} element={<AmbangSensorPage />} /> },

          // 05 · Laporan — admin (demo read-only)
          { path: '/laporan', element: <RequireAuth allow={ADMIN_DEMO} element={<LaporanPage />} /> },

          // 06 · Sistem — Manajemen User [admin] + [demo] (demo = admin read-only)
          { path: '/user', element: <RequireAuth allow={ADMIN_DEMO} element={<ManajemenUserPage />} /> },
          // 07 · Riwayat Audit — admin + demo (baca saja; backend: requireRole admin)
          { path: '/audit', element: <RequireAuth allow={ADMIN_DEMO} element={<AuditPage />} /> },

          // alias gaya .pen / mockup → resource route Laravel
          { path: '/master/jenis-tanaman', element: <Navigate to="/tanaman" replace /> },
          { path: '/master/meja-tanaman', element: <Navigate to="/meja" replace /> },
          { path: '/master/ambang-sensor', element: <Navigate to="/ambang" replace /> },
          { path: '/water-control', element: <Navigate to="/dashboard" replace /> },
          { path: '/tanam-saya', element: <Navigate to="/tanam" replace /> },
          { path: '/durasi-siklus', element: <Navigate to="/siklus" replace /> },
          { path: '/manajemen-user', element: <Navigate to="/user" replace /> },
          { path: '/data-tahap/semai', element: <Navigate to="/semai" replace /> },
          { path: '/data-tahap/peremajaan', element: <Navigate to="/peremajaan" replace /> },
          { path: '/data-tahap/pendewasaan', element: <Navigate to="/pendewasaan" replace /> },
          { path: '/data-tahap/panen', element: <Navigate to="/panen" replace /> },
        ],
      },
    ],
  },
],
  },
])
