/** Logo KKN Arutmin Asik 2026 — dipakai di sidebar, login, footer, dan halaman Tentang.
 *  Dibungkus chip putih agar sayap hitam tetap terbaca di latar navy. */
export function Monogram({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <span className={`${className} inline-flex items-center justify-center rounded-lg bg-white/95 p-[2px] shadow-sm`}>
      <img src="/logo/kkn.png" alt="Logo KKN Arutmin Asik 2026" className="h-full w-full object-contain" draggable={false} />
    </span>
  )
}
