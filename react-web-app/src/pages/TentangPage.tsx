import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Monogram } from '../components/Monogram'
import { SiteFooter } from '../components/SiteFooter'
import { useAuth } from '../lib/authContext'
import { useReveal } from '../lib/useReveal'
import { useSplash } from '../lib/useSplash'
import { usePudarTepi } from '../lib/usePudarTepi'
import { InfoTekan } from '../components/InfoTekan'
import { info } from '../lib/info'
import { DataLangsung } from '../components/DataLangsung'
import { FONT_SKRIP, Percikan } from '../components/tentang/BannerKKN'
import { GrupMerek, PilSosial } from '../components/tentang/GrupMerek'
import { SplashTentang } from '../components/tentang/SplashTentang'

const BAGIAN = ['sistem', 'cara-kerja', 'data', 'aplikasi', 'mitra', 'tim']

/** Bagian yang sedang di tengah layar — untuk menandai tautan header (aria-current). */
function useScrollspy(ids: string[]) {
  const [aktif, setAktif] = useState('')
  useEffect(() => {
    const els = ids.map((i) => document.getElementById(i)).filter((e): e is HTMLElement => !!e)
    if (typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setAktif(e.target.id)
      },
      { rootMargin: '-35% 0px -55% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [ids])
  return aktif
}

/**
 * TENTANG KAMI (/tentang) — halaman publik, TANPA login (rute berdiri sendiri
 * di luar RequireAuth, seperti /login). Berisi 7 kartu peran tim proyek
 * Vertonik Smart Farm (GARAP — greenhouse hidroponik).
 * Nama anggota sengaja DIKOSONGKAN dengan placeholder '(nama)' — halaman ini
 * tidak mengarang nama orang.
 */

type Peran = {
  jabatan: string
  nama: string
  deskripsi: string
  ikon: ReactNode
  /** Foto potongan (PNG transparan) di public/tim/ — tampil keluar dari kartu. Kosong = avatar inisial. */
  foto?: string
}

/** Ikon garis minimalis (24×24, stroke currentColor) — senada monogram Vertonik. */
function Ikon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

const PERAN: Peran[] = [
  {
    jabatan: 'Project Manager',
    nama: 'Rivi Ramdani',
    foto: '/tim/rivi-ramdani.png',
    deskripsi:
      'Memimpin arah proyek Vertonik Smart Farm: menyusun rencana kerja, membagi tugas, dan memastikan seluruh tim bergerak menuju tujuan yang sama.',
    ikon: <Ikon><path d="m12 3 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4 6.8 19.2l1-5.9L3.5 9.2l5.9-.8z" /></Ikon>,
  },
  {
    jabatan: 'Finance',
    nama: 'Nova Atika Angelia',
    foto: '/tim/nova-atika-angelia.png',
    deskripsi:
      'Mengelola anggaran proyek dan mencatat setiap pengeluaran — dari pengadaan sensor, perangkat IoT, sampai kebutuhan operasional greenhouse.',
    ikon: <Ikon><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.6" /><path d="M6 10v4M18 10v4" /></Ikon>,
  },
  {
    jabatan: 'Secretary',
    nama: 'Putri Nadilatu Zahra',
    foto: '/tim/putri-nadilatu-zahra.png',
    deskripsi:
      'Menata dokumentasi proyek, menyusun notulen rapat, dan menjaga komunikasi antaranggota tim tetap teratur dan mudah ditemukan.',
    ikon: <Ikon><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></Ikon>,
  },
  {
    jabatan: 'Creative & Public Relations',
    nama: 'Siti Azizahtusholihah',
    foto: '/tim/siti-azizahtusholihah.png',
    deskripsi:
      'Merancang identitas visual dan kabar terbaru proyek, serta menjaga hubungan baik dengan pengguna dan mitra Vertonik Smart Farm.',
    ikon: <Ikon><path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1z" /><path d="M17.5 9.5a4 4 0 0 1 0 5" /></Ikon>,
  },
  {
    jabatan: 'Backend Engineering',
    nama: 'Muhammad Rizki Maulana',
    foto: '/tim/muhammad-rizki-maulana.png',
    deskripsi:
      'Membangun dan merawat API GARAP beserta basis data greenhouse, agar data sensor dan budidaya tersimpan aman, konsisten, dan andal.',
    ikon: <Ikon><ellipse cx="12" cy="6" rx="7.5" ry="3" /><path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" /><path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" /></Ikon>,
  },
  {
    jabatan: 'IoT Engineer',
    nama: 'Muhammad Zainal Haqi',
    foto: '/tim/muhammad-zainal-haqi.png',
    deskripsi:
      'Merancang perangkat ESP32 dan rangkaian sensor hidroponik yang mengirim suhu, pH, dan TDS greenhouse secara real-time ke sistem.',
    ikon: <Ikon><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" /></Ikon>,
  },
  {
    jabatan: 'Web & Application Developer',
    nama: 'Eka Ridhoni August Firmansyah',
    foto: '/tim/eka-ridhoni-august-firmansyah.png',
    deskripsi:
      'Mengembangkan antarmuka web dan aplikasi yang membuat petani mudah memantau kondisi serta mengatur tanam dari mana saja.',
    ikon: <Ikon><rect x="2.5" y="4.5" width="19" height="13" rx="2" /><path d="M8 21h8M12 17.5V21" /><path d="m10 9-2 2 2 2M14 9l2 2-2 2" /></Ikon>,
  },
]

/** Angka sistem dari dokumen Perancangan Sistem IoT Hidroponik (FINAL). */
const MITRA = [
  { nama: 'KKN Arutmin Asik 2026', peran: 'Program KKN Industri', src: '/logo/kkn.png', teks: 'Program Kuliah Kerja Nyata Industri mahasiswa Politeknik Negeri Tanah Laut di PT Arutmin Indonesia tahun 2026. Vertonik Smart Farm adalah salah satu hasil kerjanya.', href: 'https://instagram.com/kkn.arutminidn2026' },
  { nama: 'PT Arutmin Indonesia', peran: 'Mitra industri', src: '/logo/arutmin.png', teks: 'Perusahaan pertambangan batubara tempat program KKN dijalankan dan mitra penyedia lokasi greenhouse.', href: 'https://www.arutmin.com' },
  { nama: 'Politeknik Negeri Tanah Laut', peran: 'Perguruan tinggi', src: '/logo/polytala.png', teks: 'Perguruan tinggi asal para mahasiswa KKN yang merancang dan membangun sistem ini.', href: 'https://polytala.ac.id' },
  { nama: 'TRKJ', peran: 'Program studi', src: '/logo/trkj.png', teks: 'Program studi Teknologi Rekayasa Komputer dan Jaringan — bidang keilmuan di balik perangkat IoT, jaringan, dan aplikasi proyek ini.' } as { nama: string; peran: string; src: string; teks: string; href?: string },
]

const ANGKA = [
  { nilai: '4', label: 'meja hidroponik', info: 'Tiga meja sistem NFT (aliran tipis) dan satu meja DFT (genangan dalam), masing-masing dengan penampung dan pengaturan sendiri.', ket: '3 NFT + 1 DFT' },
  { nilai: '1.220', label: 'lubang tanam', info: 'Jumlah seluruh lubang tanam di keempat meja. Dari sinilah kapasitas panen dihitung.', ket: 'total keempat meja' },
  { nilai: '±70 L', label: 'penampung per meja', info: 'Setiap meja punya penampung ±70 liter dengan target (setpoint) nutrisi dan kunci pengaman (LOCK) sendiri.', ket: 'setpoint & LOCK sendiri' },
  { nilai: '1', label: 'pengendali ESP32', info: 'Satu mikrokontroler ESP32 mengurus semua meja secara bergiliran: satu aksi pada satu waktu supaya arus pompa aman.', ket: 'bergiliran, satu aksi satu waktu' },
]

const APLIKASI = [
  { judul: 'Dashboard Web', info: 'Ringkasan semua meja: status sensor, alert terbuka, dan panen terakhir. Perlu login.', href: '/dashboard', tag: 'Web', teks: 'Ringkasan kebun, alert terbuka, dan status tiap meja dalam satu layar.',
    ikon: <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M7 14l3-3 3 2 4-5M8 21h8" /></> },
  { judul: 'Aplikasi Mobile', info: 'Versi ponsel (Flutter) untuk petani: notifikasi alert, siklus tanam, CCTV, dan asisten AI.', tag: 'Android · iOS', teks: 'Pantau dan terima notifikasi dari kebun lewat ponsel, di mana saja.',
    ikon: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></> },
  { judul: 'Sensor Real-time', info: 'Grafik dan angka EC, pH, suhu air, serta suhu dan kelembapan ruang yang diperbarui terus. Perlu login.', href: '/sensor-realtime', tag: 'Web · Mobile', teks: 'EC, pH, suhu, dan kelembapan tiap penampung dengan riwayat grafik.',
    ikon: <><path d="M12 3c3 4 5 6.6 5 9.5a5 5 0 0 1-10 0C7 9.600 9 7 12 3z" /></> },
  { judul: 'Dosing Otomatis', info: 'Atur dan pantau dosing nutrisi A/B. Perangkat ESP32 menjalankan pompa, aplikasi hanya mengatur target. Perlu login.', href: '/dosing', tag: 'Perangkat ESP32', teks: 'Nutrisi A dan B disuntik terukur, dibilas, lalu diverifikasi ulang.',
    ikon: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.800 3h10.400A2 2 0 0 0 19 18l-5-9V3" /><path d="M7.500 15h9" /></> },
  { judul: 'CCTV Kebun', info: 'Tampilan kamera greenhouse langsung dari aplikasi. Perlu login.', href: '/cctv', tag: 'Web · Mobile', teks: 'Lihat kondisi tanaman langsung dari kamera tanpa ke lokasi.',
    ikon: <><path d="M3 8l12-3 2 5-12 3zM17 10l4 1v4l-4-1M8 17l-1 4" /></> },
  { judul: 'Asisten AI', info: 'Tanya kondisi kebun, minta diagnosa menyeluruh, dan terima tabel data. Dilengkapi pengaman anti manipulasi prompt. Perlu login.', href: '/asisten-ai', tag: 'Web · Mobile', teks: 'Tanya kondisi kebun, minta diagnosa, dan dapat tabel data siap baca.',
    ikon: <><path d="M12 3l1.800 4.800L18.600 9.600 13.800 11.400 12 16.200 10.200 11.400 5.400 9.600 10.200 7.800zM19 15l.8 2.200L22 18l-2.200.8L19 21l-.8-2.200L16 18l2.200-.8z" /></> },
]

const ALUR = [
  { no: '01', judul: 'Baca', info: 'Pembacaan dilakukan saat air diam di botol sampel agar nilai EC, pH, dan suhu stabil dan akurat.', teks: 'Air tiap penampung diambil ke botol sampel, lalu EC, pH, dan suhu dibaca saat air diam.' },
  { no: '02', judul: 'Putuskan', info: 'Sistem membandingkan hasil bacaan dengan target. Keputusannya hanya tiga: istirahat, dosing, atau alert.', teks: 'Sesuai target → istirahat 60 menit. Kurang → antre dosing. Di luar batas aman → kirim alert.' },
  { no: '03', judul: 'Bertindak', info: 'Dosing dibagi per ronde (65% dari kekurangan) lalu diverifikasi ulang, sehingga nutrisi tidak pernah berlebih.', teks: 'Suntik A, bilas, jeda 2 menit, suntik B, bilas, tunggu 15 menit, lalu baca ulang.' },
]

/** Palet blok kolase per anggota (a→b gradasi blok utama, x/y blok aksen). */
const PALET = [
  { a: '#FFD45E', b: '#F5A81C', x: '#0A1F38', y: '#8F1D2C' },
  { a: '#7FE0C2', b: '#1FA37F', x: '#0A1F38', y: '#E9CD53' },
  { a: '#9CC4FF', b: '#3F7BEA', x: '#8F1D2C', y: '#0A1F38' },
  { a: '#FF9E8A', b: '#E5533D', x: '#0A1F38', y: '#E9CD53' },
  { a: '#C9B6FF', b: '#7A5CFF', x: '#0A1F38', y: '#FFD45E' },
  { a: '#D8EE8A', b: '#8FBF2F', x: '#8F1D2C', y: '#0A1F38' },
  { a: '#FFC4DF', b: '#E8589B', x: '#0A1F38', y: '#E9CD53' },
]

/** Siluet pengganti foto — posisi & ukuran sama dengan foto asli (h-84, keluar dari kartu). */
function Siluet({ warna }: { warna: string }) {
  return (
    <svg
      viewBox="0 0 200 336"
      className="pointer-events-none absolute left-1/2 top-[-71px] z-20 h-[339px] w-auto -translate-x-1/2"
      aria-hidden="true"
      focusable="false"
    >
      {/* kontur putih dulu, lalu isi warna — tanpa garis di sambungan kepala/leher/bahu */}
      <g fill="#fff" stroke="#fff" strokeWidth="9" strokeLinejoin="round">
        <path d="M18 336c0-78 40-118 82-118s82 40 82 118z" />
        <rect x="82" y="150" width="36" height="76" rx="14" />
        <circle cx="100" cy="100" r="46" />
      </g>
      <g fill={warna}>
        <path d="M18 336c0-78 40-118 82-118s82 40 82 118z" />
        <rect x="82" y="150" width="36" height="76" rx="14" />
        <circle cx="100" cy="100" r="46" />
      </g>
      <text x="100" y="318" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff" letterSpacing="1.5">FOTO SEGERA</text>
    </svg>
  )
}

const MAROON = '#8F1D2C'

export function TentangPage() {
  const { isAuthenticated } = useAuth()
  const { hash } = useLocation()
  const refMuncul = useReveal<HTMLElement>()

  // Kilau spekular Liquid Glass mengikuti kursor di atas kartu/pil kaca.
  const rafKilau = useRef(0)
  function kilau(e: PointerEvent<HTMLElement>) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.vsf-card, .vsf-kaca')
    if (!el || rafKilau.current) return
    const { clientX, clientY } = e
    // satu pembaruan per frame — pointermove bisa datang >100×/detik
    rafKilau.current = requestAnimationFrame(() => {
      rafKilau.current = 0
      const r = el.getBoundingClientRect()
      const px = (clientX - r.left) / r.width
      const py = (clientY - r.top) / r.height
      el.style.setProperty('--mx', `${px * 100}%`)
      el.style.setProperty('--my', `${py * 100}%`)
      el.style.setProperty('--ry', `${(px - 0.5) * 9}deg`)
      el.style.setProperty('--rx', `${-(py - 0.5) * 9}deg`)
    })
  }

  const { awal, fase, keluar, selesai } = useSplash()
  const akar = useRef<HTMLDivElement>(null)
  const heroGrup = useRef<HTMLDivElement>(null)
  const aktif = useScrollspy(BAGIAN)
  usePudarTepi(fase === 'selesai')

  // selama splash: halaman diam (tanpa gulir) dan tidak bisa difokus/ditekan
  useEffect(() => {
    document.documentElement.classList.toggle('vsf-splash-aktif', fase !== 'selesai')
    return () => document.documentElement.classList.remove('vsf-splash-aktif')
  }, [fase])
  useEffect(() => {
    akar.current?.toggleAttribute('inert', fase === 'tampil')
  }, [fase])

  // muat & decode foto/logo SETELAH splash (tidak berebut bandwidth dengan latar & font splash)
  useEffect(() => {
    if (fase !== 'selesai') return undefined
    const daftar = [...PERAN.map((p) => p.foto), ...MITRA.map((m) => m.src)].filter((u): u is string => Boolean(u))
    const muat = () => {
      for (const u of daftar) {
        const im = new Image()
        im.src = u
        void im.decode?.().catch(() => undefined)
      }
    }
    const ric = window.requestIdleCallback
    if (ric) {
      const id = ric(muat, { timeout: 2000 })
      return () => window.cancelIdleCallback(id)
    }
    const t = window.setTimeout(muat, 300)
    return () => window.clearTimeout(t)
  }, [fase])

  // React Router tidak menggulir ke #anchor sendiri — lakukan setelah render.
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 })
      return
    }
    const el = document.getElementById(hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <div ref={akar} data-splash={fase === 'selesai' ? undefined : fase} className="vsf-tentang relative isolate flex min-h-dvh flex-col text-tinta">
      <div className="vsf-latar" aria-hidden />
      <div className="vsf-kabut" aria-hidden />
      {fase !== 'selesai' && <SplashTentang target={() => heroGrup.current} onKeluar={keluar} onSelesai={selesai} />}
      {/* Header — bilah liquid glass melayang di atas foto langit */}
      <header className="vsf-sp vsf-topbar sticky top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-4" style={{ ['--sd' as string]: '.35s' }}>
        <div className="vsf-bilah mx-auto flex min-h-[60px] max-w-[1180px] items-center gap-3 py-2 pl-3 pr-2 sm:pl-4">
          <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Vertonik Smart Farm">
            <Monogram className="h-10 w-14 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate font-display text-[17px] font-bold leading-tight text-white">Vertonik</span>
              <span className="block truncate text-[12px] font-semibold text-[var(--emas)]">Smart Farm</span>
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-1 text-[14px] font-medium lg:flex" aria-label="Bagian halaman">
            {[
              ['sistem', 'Sistem'],
              ['cara-kerja', 'Cara kerja'],
              ['data', 'Data'],
              ['aplikasi', 'Aplikasi'],
              ['mitra', 'Mitra'],
              ['tim', 'Tim'],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="vsf-bilah-tautan" aria-current={aktif === id ? 'true' : undefined}>{label}</a>
            ))}
          </nav>
          <Link to={isAuthenticated ? '/dashboard' : '/login'} className="vsf-bilah-tombol ml-auto shrink-0 lg:ml-2">
            {isAuthenticated ? 'Dashboard' : 'Login'}
          </Link>
        </div>
      </header>

      <main ref={refMuncul} onPointerMove={kilau} className="vsf-satu mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 sm:px-6">
        {/* Hero — grup merek (tujuan terbang splash) + ajakan; tombol ada di halaman, bukan di splash */}
        <section className="flex min-h-[calc(100dvh-150px)] flex-col items-center justify-center py-8 text-center" aria-labelledby="vsf-hero-title">
          <div className="vsf-hero-grup flex w-full justify-center">
            <GrupMerek ref={heroGrup} animasi={!awal} interaktif judul />
          </div>
          <p className="vsf-sp mt-5 max-w-[560px] text-[15px] leading-relaxed text-white [text-shadow:0_2px_12px_rgba(7,21,39,.7)]" style={{ ['--sd' as string]: '.5s' }}>
            Merawat nutrisi tanaman, tanpa petani harus menakar sendiri.
          </p>
          <div className="vsf-sp mt-5 flex flex-wrap justify-center gap-2" style={{ ['--sd' as string]: '.6s' }}>
            <Link to={isAuthenticated ? '/dashboard' : '/login'} className="vsf-btn-primary">
              {isAuthenticated ? 'Dashboard' : 'Login'}
            </Link>
            <a href="#cara-kerja" className="vsf-kaca vsf-kaca-hidup inline-flex min-h-[44px] items-center rounded-full px-5 text-[13px] font-semibold text-navy">
              Cara kerja sistem
            </a>
            <a href="#tim" className="vsf-kaca vsf-kaca-hidup inline-flex min-h-[44px] items-center rounded-full px-5 text-[13px] font-semibold text-navy">
              Kenali tim
            </a>
          </div>
        </section>

        {/* Pengantar GARAP + angka sistem (bento) */}
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <section className="vsf-card vsf-muncul flex flex-col justify-center p-6 sm:p-8" aria-labelledby="vsf-intro-title">
            <div className="vsf-eyebrow">Tentang Kami</div>
            <h2 id="vsf-intro-title" className="mt-2 max-w-[760px] text-[22px] leading-snug sm:text-[28px]">
              Merawat nutrisi tanaman, tanpa petani harus menakar sendiri.
            </h2>
            <p className="mt-3 max-w-[760px] text-[14.5px] leading-relaxed text-slate-600">
              Vertonik Smart Farm (GARAP) adalah sistem IoT untuk greenhouse hidroponik multi-penampung. Satu alat kontrol
              menjaga kadar nutrisi dan pH tiap meja, lalu mengabarkan semua kejadian ke aplikasi petani.
            </p>
            <p className="mt-4 text-[12px] text-slate-500">Tekan kartu untuk membuka tautan, tahan untuk membaca penjelasannya.</p>
          </section>

          <section id="sistem" className="grid scroll-mt-24 grid-cols-2 gap-3" aria-label="Angka sistem">
            {ANGKA.map((a, i) => (
              <div key={a.label} {...info(a.label, a.info)} className="vsf-card vsf-muncul flex flex-col justify-center p-4" style={{ ['--d' as string]: `${i * 0.08}s` }}>
                <div className="font-display text-[28px] font-bold leading-none text-arutmin-forest">{a.nilai}</div>
                <div className="mt-2 text-[13px] font-semibold text-tinta">{a.label}</div>
                <div className="mt-0.5 text-[12px] text-slate-500">{a.ket}</div>
              </div>
            ))}
          </section>
        </div>

        <DataLangsung />

        {/* Aplikasi dalam satu ekosistem */}
        <section id="aplikasi" className="mt-12 scroll-mt-24" aria-labelledby="vsf-fitur-title">
          <div className="vsf-eyebrow vsf-judul-latar">Aplikasi</div>
          <h2 id="vsf-fitur-title" className="vsf-judul-latar mt-2 text-[22px] sm:text-[28px]">Satu ekosistem, dari sensor sampai ke genggaman petani</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {APLIKASI.map((f, i) => (
              <article key={f.judul} {...info(f.judul, f.info, f.href)} className="vsf-card vsf-kaca-hidup vsf-muncul group flex flex-col gap-3 rounded-3xl p-5" style={{ ['--d' as string]: `${i * 0.07}s` }}>
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-navy to-[#14407a] text-[#E9CD53] shadow-md transition-transform duration-500 [transition-timing-function:var(--pegas)] group-hover:-rotate-6 group-hover:scale-110">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{f.ikon}</svg>
                  </span>
                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-navy ring-1 ring-white/80">{f.tag}</span>
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-tinta">{f.judul}</h3>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600">{f.teks}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Cara kerja */}
        <section id="cara-kerja" className="mt-12 scroll-mt-24" aria-labelledby="vsf-alur-title">
          <div className="vsf-eyebrow vsf-judul-latar">Cara kerja</div>
          <h2 id="vsf-alur-title" className="vsf-judul-latar mt-2 text-[22px]">Satu siklus, bergiliran untuk tiap penampung</h2>
          <ol className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {ALUR.map((a) => (
              <li key={a.no} {...info(a.judul, a.info)} className="vsf-card vsf-muncul relative overflow-hidden p-5" style={{ ['--d' as string]: `${ALUR.indexOf(a) * 0.1}s` }}>
                <span className="absolute right-4 top-3 font-display text-[40px] font-bold leading-none text-arutmin-mint" aria-hidden>
                  {a.no}
                </span>
                <div className="relative">
                  <div className="text-[16px] font-bold text-tinta">{a.judul}</div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">{a.teks}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>


        {/* Mitra & institusi — logo resmi */}
        <section id="mitra" className="mt-16 scroll-mt-24" aria-labelledby="vsf-mitra-title">
          <h2 id="vsf-mitra-title" className="vsf-judul-latar text-center font-display text-[22px] font-bold sm:text-[26px]">
            Kolaborasi KKN Arutmin Asik 2026
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {MITRA.map((m, i) => (
              <figure
                key={m.nama}
                {...info(m.nama, m.teks, m.href)}
                className="vsf-muncul vsf-kaca vsf-kaca-hidup flex flex-col items-center rounded-3xl p-5 text-center"
                style={{ ['--d' as string]: `${i * 0.08}s` }}
              >
                <div className="flex h-24 w-full items-center justify-center sm:h-28">
                  <img src={m.src} alt={`Logo ${m.nama}`} className="max-h-full max-w-full object-contain" draggable={false} />
                </div>
                <figcaption className="mt-3 text-[12.5px] font-bold text-navy">{m.nama}</figcaption>
                <span className="text-[12px] text-slate-600">{m.peran}</span>
              </figure>
            ))}
          </div>
        </section>

        {/* Tim — poster "Our Team": langit + gunung, kartu jaket almamater (marun) */}
        <section id="tim" className="mt-16 scroll-mt-24 pb-6" aria-labelledby="vsf-peran-title">
          <div>
            <div className="vsf-muncul flex items-center justify-center gap-2 text-center">
              <Percikan kiri />
              <h2 id="vsf-peran-title" className="text-[44px] font-normal leading-none text-white [text-shadow:0_3px_20px_rgba(7,21,39,.6)] sm:text-[64px]" style={{ fontFamily: FONT_SKRIP }}>
                Our Team
              </h2>
              <Percikan />
            </div>
            <p className="vsf-muncul mx-auto mt-3 max-w-[560px] text-center text-[14px] leading-relaxed text-white [text-shadow:0_2px_12px_rgba(7,21,39,.7)]" style={{ ['--d' as string]: '.1s' }}>
              Tujuh peran, satu tujuan: perencanaan, perangkat, dan aplikasi dikerjakan bersama.
            </p>

            {[
              { judul: 'Manajemen', isi: PERAN.slice(0, 3), kolom: 'lg:grid-cols-3', mulai: 0 },
              { judul: 'Teknis & kreatif', isi: PERAN.slice(3), kolom: 'lg:grid-cols-4', mulai: 3 },
            ].map((g) => (
              <div key={g.judul} className="mt-4">
                <div className={`grid grid-cols-1 gap-x-4 gap-y-24 sm:grid-cols-2 lg:gap-y-4 ${g.kolom} pt-28`}>
                  {g.isi.map((p, i) => {
                    const kosong = p.nama === '(nama)'
                    const pal = PALET[(g.mulai + i) % PALET.length]
                    return (
                      <div key={p.jabatan} className="vsf-muncul group relative" style={{ ['--d' as string]: `${i * 0.09}s` }}>
                        <article
                          className="vsf-kaca vsf-kaca-hidup relative flex h-full flex-col rounded-card"
                        >
                          {/* panggung kolase seragam untuk semua anggota */}
                          <div className="relative mt-3 h-64 shrink-0" aria-hidden>
                            <i className="absolute inset-x-7 bottom-0 top-20 rounded-t-[28px] shadow-[inset_0_2px_0_rgba(255,255,255,.6)]" style={{ background: `linear-gradient(135deg, ${pal.a}, ${pal.b})` }} />
                            <i className="absolute bottom-0 left-3 h-28 w-14 rounded-tr-[22px]" style={{ background: pal.x }} />
                            <i className="absolute bottom-0 right-3 h-20 w-14 rounded-tl-[22px]" style={{ background: pal.y }} />
                            <i className="vsf-kedip absolute right-6 top-14 h-5 w-5 rounded-full bg-white/90" />
                          </div>
                          <div className="flex flex-1 flex-col p-5 pt-3">
                            <div className="min-w-0">
                              <div className={`text-[15px] font-bold leading-snug ${kosong ? 'italic text-slate-400' : 'text-tinta'}`}>
                                {kosong ? 'Segera diisi' : p.nama}
                              </div>
                              <div className="mt-0.5 flex items-start gap-1.5 text-[12.5px] font-semibold leading-snug" style={{ color: MAROON }}>
                                <span className="shrink-0">{p.ikon}</span>
                                <span>{p.jabatan}</span>
                              </div>
                            </div>
                            <p className="mt-4 flex-1 text-[13.5px] leading-relaxed text-slate-600">{p.deskripsi}</p>
                          </div>
                        </article>
                        {/* di luar kartu → tidak tertimpa tepi kaca/rim/blur; selalu di lapisan teratas */}
                        {p.foto ? (
                          <img
                            src={p.foto}
                            alt=""
                            draggable={false}
                            loading="lazy"
                            decoding="async"
                            className="pointer-events-none absolute left-1/2 top-[-71px] z-20 h-[339px] w-auto max-w-none -translate-x-1/2 select-none object-contain object-bottom transition-transform duration-500 [transition-timing-function:var(--pegas)] group-hover:-translate-y-[5px] group-hover:scale-[1.04]"
                          />
                        ) : (
                          <Siluet warna={pal.x} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Ajakan penutup */}
        <section className="vsf-muncul vsf-kaca vsf-kaca-netral mt-16 flex flex-col items-center gap-4 rounded-[32px] px-6 py-10 text-center" aria-labelledby="vsf-cta-title">
          <h2 id="vsf-cta-title" className="font-display text-[24px] font-bold text-white sm:text-[30px]">Siap memantau kebun Anda?</h2>
          <p className="max-w-[520px] text-[14px] leading-relaxed text-white/80">Login untuk melihat sensor, mengatur dosing, dan bertanya pada asisten AI.</p>
          <Link to={isAuthenticated ? '/dashboard' : '/login'} className="vsf-btn-primary">{isAuthenticated ? 'Dashboard' : 'Login'}</Link>
          <PilSosial interaktif netral />
        </section>
      </main>
      <InfoTekan />
      <SiteFooter />
    </div>
  )
}

export default TentangPage
