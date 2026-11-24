import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Monogram } from '../components/Monogram'
import { SiteFooter } from '../components/SiteFooter'
import { useAuth } from '../lib/authContext'
import { useReveal } from '../lib/useReveal'
import { useSplash } from '../lib/useSplash'
import { usePudarTepi } from '../lib/usePudarTepi'
import { FONT_SKRIP, Percikan } from '../components/tentang/BannerKKN'
import { GrupMerek, PilSosial } from '../components/tentang/GrupMerek'
import { SplashTentang } from '../components/tentang/SplashTentang'
import { SaklarTema } from '../components/SaklarTema'

const BAGIAN = ['sistem', 'politala', 'cara-kerja', 'tim']
const LABEL_BAGIAN: Record<string, string> = {
  sistem: 'Tentang GARAP',
  politala: 'Politala',
  'cara-kerja': 'Cara kerja',
  tim: 'Anggota tim',
}

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
 * TENTANG KAMI (/) — halaman publik tentang GARAP (Vertonik Smart Farm),
 * keterlibatan Politeknik Negeri Tanah Laut dalam program KKN Industri di
 * PT Arutmin Indonesia, cara kerja sistem dalam 3 langkah sederhana, serta
 * galeri ketujuh anggota tim pengembang.
 */

type Peran = {
  jabatan: string
  nama: string
  foto: string
}

type Pembimbing = {
  nama: string
  label: string
  instansi: string
  peran: string
  foto: string
  gayaFoto: string
  latarPutih?: boolean
}

const PEMBIMBING: Pembimbing[] = [
  {
    nama: 'Nurul Yakin',
    label: 'Pembimbing Lapangan',
    instansi: 'PT Arutmin Indonesia',
    peran: 'Mendampingi kegiatan KKN di lapangan serta penerapan Vertonik Smart Farm pada greenhouse PT Arutmin Indonesia.',
    foto: '/pembimbing/nurul-yakin.png',
    gayaFoto: 'absolute bottom-0 left-1/2 h-[20.5rem] w-auto max-w-none -translate-x-1/2 object-contain object-bottom',
  },
  {
    nama: 'Abdul Majid',
    label: 'Pembimbing Lapangan',
    instansi: 'PT Arutmin Indonesia',
    peran: 'Mendampingi kegiatan KKN di lapangan serta penerapan Vertonik Smart Farm pada greenhouse PT Arutmin Indonesia.',
    foto: '/pembimbing/abdulmajid.png',
    gayaFoto: 'absolute top-3 left-1/2 h-[30rem] w-auto max-w-none -translate-x-1/2 object-contain object-top',
  },
  {
    nama: 'Raka Pradiva Permadi',
    label: 'Pembimbing Lapangan',
    instansi: 'PT Arutmin Indonesia',
    peran: 'Mendampingi kegiatan KKN di lapangan serta penerapan Vertonik Smart Farm pada greenhouse PT Arutmin Indonesia.',
    foto: '/pembimbing/raka-pradvia-permadi.jpg',
    gayaFoto: 'absolute bottom-0 left-1/2 h-[21rem] w-auto max-w-none -translate-x-1/2 object-contain object-bottom',
    latarPutih: true,
  },
  {
    nama: 'I Made Candra Girinata',
    label: 'Dosen Pembimbing',
    instansi: 'Politeknik Negeri Tanah Laut',
    peran: 'Membimbing pelaksanaan kegiatan KKN Industri serta pengembangan sistem Vertonik Smart Farm (GARAP).',
    foto: '/pembimbing/i-made-candra-girinata.png',
    gayaFoto: 'absolute bottom-0 left-1/2 h-[20rem] w-auto max-w-none -translate-x-1/2 object-contain object-bottom',
  },
]

const PERAN: Peran[] = [
  { jabatan: 'Project Manager', nama: 'Rivi Ramdani', foto: '/tim/rivi-ramdani.webp' },
  { jabatan: 'Finance', nama: 'Nova Atika Angelia', foto: '/tim/nova-atika-angelia.webp' },
  { jabatan: 'Secretary', nama: 'Putri Nadilatu Zahra', foto: '/tim/putri-nadilatu-zahra.webp' },
  { jabatan: 'Creative & Public Relations', nama: 'Siti Azizahtusholihah', foto: '/tim/siti-azizahtusholihah.webp' },
  { jabatan: 'Backend Engineering', nama: 'Muhammad Rizki Maulana', foto: '/tim/muhammad-rizki-maulana.webp' },
  { jabatan: 'IoT Engineer', nama: 'Muhammad Zainal Haqi', foto: '/tim/muhammad-zainal-haqi.webp' },
  { jabatan: 'Web & Application Developer', nama: 'Eka Ridhoni August Firmansyah', foto: '/tim/eka-ridhoni-august-firmansyah.webp' },
]

const ALUR = [
  {
    no: '01',
    judul: 'Kondisi greenhouse dipantau',
    teks: 'Sistem mengumpulkan informasi mengenai keadaan lingkungan greenhouse dan tanaman secara berkelanjutan.',
  },
  {
    no: '02',
    judul: 'Informasi ditampilkan di website atau ponsel',
    teks: 'Ringkasan kondisi kebun disajikan dengan tampilan yang rapi dan mudah dilihat melalui website maupun ponsel.',
  },
  {
    no: '03',
    judul: 'Petani menentukan perawatan',
    teks: 'Informasi yang tampil digunakan petani sebagai panduan untuk memilih langkah perawatan tanaman yang tepat.',
  },
]

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
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    if (!menu) return undefined
    const tutup = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('keydown', tutup)
    return () => window.removeEventListener('keydown', tutup)
  }, [menu])
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
    const daftar = [...PEMBIMBING.map((p) => p.foto), ...PERAN.map((p) => p.foto)].filter((u): u is string => Boolean(u))
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
            <span className="hidden min-w-0 min-[420px]:block">
              <span className="block truncate font-display text-[17px] font-bold leading-tight text-white">Vertonik</span>
              <span className="block truncate text-[12px] font-semibold text-[var(--emas)]">Smart Farm</span>
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-1 text-[14px] font-medium lg:flex" aria-label="Bagian halaman">
            {BAGIAN.map((id) => (
              <a key={id} href={`#${id}`} className="vsf-bilah-tautan" aria-current={aktif === id ? 'true' : undefined}>
                {LABEL_BAGIAN[id]}
              </a>
            ))}
          </nav>
          <SaklarTema className="ml-auto lg:ml-2" />
          {/* HP/tablet: menu bagian di balik tombol (nav lebar disembunyikan di bawah lg) */}
          <button
            type="button"
            className="vsf-bilah-tombol-kaca grid h-11 w-11 shrink-0 place-items-center rounded-full lg:hidden"
            aria-expanded={menu}
            aria-controls="menu-bagian"
            aria-label={menu ? 'Tutup menu bagian' : 'Buka menu bagian'}
            onClick={() => setMenu((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          <Link to={isAuthenticated ? '/dashboard' : '/login'} className="vsf-bilah-tombol shrink-0">
            {isAuthenticated ? 'Dashboard' : 'Login'}
          </Link>
        </div>
        {menu && (
          <nav id="menu-bagian" aria-label="Bagian halaman" className="vsf-bilah mx-auto mt-2 max-w-[1180px] p-2 lg:hidden">
            <ul className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {BAGIAN.map((id) => (
                <li key={id}>
                  <a href={`#${id}`} onClick={() => setMenu(false)} className="vsf-bilah-tautan min-h-[44px] w-full" aria-current={aktif === id ? 'true' : undefined}>
                    {LABEL_BAGIAN[id]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main ref={refMuncul} onPointerMove={kilau} className="vsf-satu mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 sm:px-6">
        {/* 1. Pembuka — judul dan pengantar singkat tentang GARAP */}
        <section className="flex min-h-[calc(100dvh-150px)] flex-col items-center justify-center py-8 text-center" aria-labelledby="vsf-hero-title">
          <div className="vsf-hero-grup flex w-full justify-center">
            <GrupMerek ref={heroGrup} animasi={!awal} interaktif judul />
          </div>
          <p className="vsf-sp mt-5 max-w-[620px] text-[15px] leading-relaxed text-white [text-shadow:0_2px_12px_rgba(7,21,39,.75)] sm:text-[16px]" style={{ ['--sd' as string]: '.5s' }}>
            <b>GARAP (Vertonik Smart Farm)</b> adalah sistem pendukung pemantauan greenhouse hidroponik yang membantu
            petani mengetahui kondisi kebun dan merawat tanaman dengan lebih mudah.
          </p>
          <div className="vsf-sp mt-5 flex flex-wrap justify-center gap-2.5" style={{ ['--sd' as string]: '.6s' }}>
            <Link to={isAuthenticated ? '/dashboard' : '/login'} className="vsf-btn-primary">
              {isAuthenticated ? 'Buka Dashboard' : 'Masuk ke Sistem'}
            </Link>
            <a href="#sistem" className="vsf-kaca vsf-kaca-hidup inline-flex min-h-[44px] items-center rounded-full px-5 text-[13px] font-semibold text-navy">
              Tentang GARAP
            </a>
            <a href="#cara-kerja" className="vsf-kaca vsf-kaca-hidup inline-flex min-h-[44px] items-center rounded-full px-5 text-[13px] font-semibold text-navy">
              Cara kerja
            </a>
            <a href="#tim" className="vsf-kaca vsf-kaca-hidup inline-flex min-h-[44px] items-center rounded-full px-5 text-[13px] font-semibold text-navy">
              Kenali tim
            </a>
          </div>
        </section>

        {/* 2 & 3. Tentang GARAP / Vertonik Smart Farm & Tentang Politeknik Negeri Tanah Laut */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <section id="sistem" className="vsf-card vsf-muncul flex flex-col justify-between scroll-mt-24 p-6 sm:p-8" aria-labelledby="vsf-intro-title">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <img src="/logo/arutmin.webp" alt="Logo PT Arutmin Indonesia" className="h-9 w-auto object-contain" draggable={false} />
                <span className="vsf-eyebrow">Tentang GARAP · Vertonik Smart Farm</span>
              </div>
              <h2 id="vsf-intro-title" className="mt-3 text-[21px] leading-snug sm:text-[25px]">
                Sistem pendukung pemantauan greenhouse hidroponik
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-slate-600">
                <b>Vertonik Smart Farm (GARAP)</b> merupakan sistem yang membantu pemantauan kondisi greenhouse
                hidroponik di PT Arutmin Indonesia. Melalui tampilan yang sederhana di website dan ponsel, petani
                dapat melihat keadaan lingkungan kebun serta perkembangan tanaman sehari-hari tanpa harus memeriksa
                setiap bagian secara manual.
              </p>
            </div>
          </section>

          <section id="politala" className="vsf-card vsf-muncul flex flex-col justify-between scroll-mt-24 p-6 sm:p-8" aria-labelledby="vsf-politala-title">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <img src="/logo/polytala.webp" alt="Logo Politeknik Negeri Tanah Laut" className="h-9 w-auto object-contain" draggable={false} />
                <img src="/logo/trkj.webp" alt="Logo TRKJ" className="h-9 w-auto object-contain" draggable={false} />
                <span className="vsf-eyebrow">Institusi Pendidikan</span>
              </div>
              <h2 id="vsf-politala-title" className="mt-3 text-[21px] leading-snug sm:text-[25px]">
                Politeknik Negeri Tanah Laut
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-slate-600">
                <b>Politeknik Negeri Tanah Laut</b> adalah perguruan tinggi asal tim mahasiswa yang menjalankan program
                Kuliah Kerja Nyata (KKN) Industri di PT Arutmin Indonesia. Dalam program ini, tim mahasiswa merancang
                dan mengembangkan sistem GARAP untuk mendukung kegiatan pemantauan dan perawatan tanaman di greenhouse.
              </p>
            </div>
          </section>
        </div>

        {/* 4. Cara kerja sistem dalam 3 langkah sederhana */}
        <section id="cara-kerja" className="mt-12 scroll-mt-24" aria-labelledby="vsf-alur-title">
          <div className="vsf-eyebrow vsf-judul-latar">Cara kerja sistem</div>
          <h2 id="vsf-alur-title" className="vsf-judul-latar mt-2 text-[22px]">
            Tiga langkah sederhana membantu pemantauan kebun
          </h2>
          <ol className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {ALUR.map((a, idx) => (
              <li
                key={a.no}
                className="vsf-card vsf-muncul relative min-h-40 overflow-hidden p-5 sm:p-6"
                style={{ ['--d' as string]: `${idx * 0.1}s` }}
              >
                <span className="absolute right-4 top-3 font-display text-[40px] font-bold leading-none text-arutmin-mint" aria-hidden>
                  {a.no}
                </span>
                <div className="relative">
                  <div className="text-[16px] font-bold text-tinta">{a.judul}</div>
                  <p className="mt-2 max-w-[36ch] text-[14px] leading-relaxed text-slate-600">{a.teks}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 5. Dosen Pembimbing & Pembimbing Lapangan — dekat dengan Anggota Kelompok */}
        <section id="pembimbing" className="mt-16 scroll-mt-24" aria-labelledby="vsf-pembimbing-title">
          <div>
            <div className="vsf-muncul flex items-center justify-center gap-2 text-center">
              <Percikan kiri />
              <h2
                id="vsf-pembimbing-title"
                className="text-[44px] font-normal leading-none text-white [text-shadow:0_3px_20px_rgba(7,21,39,.65)] sm:text-[64px]"
                style={{ fontFamily: FONT_SKRIP }}
              >
                Dosen Pembimbing
              </h2>
              <Percikan />
            </div>
            <p className="vsf-muncul mx-auto mt-3 max-w-[640px] text-center text-[14.5px] leading-relaxed text-white [text-shadow:0_2px_12px_rgba(7,21,39,.75)]" style={{ ['--d' as string]: '.1s' }}>
              Dosen pembimbing dari Politeknik Negeri Tanah Laut bersama pembimbing lapangan dari PT Arutmin Indonesia
              yang mengarahkan kegiatan KKN Industri serta pengembangan Vertonik Smart Farm (GARAP).
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PEMBIMBING.map((p, i) => (
                <article
                  key={p.nama}
                  className="vsf-muncul vsf-kaca vsf-kaca-hidup flex flex-col overflow-hidden rounded-card"
                  style={{ ['--d' as string]: `${i * 0.07}s` }}
                >
                  <div
                    className={
                      p.latarPutih
                        ? 'relative h-[21rem] overflow-hidden bg-white'
                        : 'vsf-foto-tim relative h-[21rem] overflow-hidden bg-gradient-to-b from-[#CFE2CE] to-[#F4F7F2]'
                    }
                  >
                    <img
                      src={p.foto}
                      alt={`Foto ${p.nama}`}
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                      className={p.gayaFoto}
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <span className="inline-flex items-center rounded-full bg-navy px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-[var(--emas)]">
                        {p.label}
                      </span>
                      <h3 className="mt-2 text-[15px] font-bold leading-snug text-tinta">{p.nama}</h3>
                      <p className="mt-0.5 text-[12.5px] font-semibold leading-snug text-arutmin-forest">
                        {p.instansi}
                      </p>
                    </div>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">{p.peran}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Anggota tim — galeri foto, nama, dan peran sesuai infografik KKN */}
        <section id="tim" className="mt-14 scroll-mt-24 pb-6" aria-labelledby="vsf-peran-title">
          <div>
            <div className="vsf-muncul flex items-center justify-center gap-2 text-center">
              <Percikan kiri />
              <h2
                id="vsf-peran-title"
                className="text-[44px] font-normal leading-none text-white [text-shadow:0_3px_20px_rgba(7,21,39,.65)] sm:text-[64px]"
                style={{ fontFamily: FONT_SKRIP }}
              >
                Anggota Kelompok
              </h2>
              <Percikan />
            </div>
            <p className="vsf-muncul mx-auto mt-3 max-w-[580px] text-center text-[14.5px] leading-relaxed text-white [text-shadow:0_2px_12px_rgba(7,21,39,.75)]" style={{ ['--d' as string]: '.1s' }}>
              Tujuh mahasiswa Politeknik Negeri Tanah Laut dalam program KKN Industri yang berkolaborasi mengembangkan
              Vertonik Smart Farm (GARAP).
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PERAN.map((p, i) => (
                <article
                  key={p.nama}
                  className="vsf-muncul vsf-kaca vsf-kaca-hidup overflow-hidden rounded-card"
                  style={{ ['--d' as string]: `${i * 0.07}s` }}
                >
                  <div className="vsf-foto-tim relative h-[21rem] overflow-hidden bg-gradient-to-b from-[#CFE2CE] to-[#F4F7F2]">
                    <img
                      src={p.foto}
                      alt={`Foto ${p.nama}`}
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                      className="absolute bottom-0 left-1/2 h-[21rem] w-auto max-w-none -translate-x-1/2 object-contain object-bottom"
                    />
                  </div>
                  <div className="min-h-[92px] p-4">
                    <h3 className="text-[15px] font-bold leading-snug text-tinta">{p.nama}</h3>
                    <p className="mt-1 text-[13px] font-semibold leading-snug text-arutmin-forest">{p.jabatan}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="vsf-muncul mt-8 flex justify-center">
              <PilSosial interaktif />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

export default TentangPage
