/** Logo KKN Arutmin Asik 2026 versi warna putih pure — dipakai di sidebar, login, footer, dan halaman Tentang. */
export function Monogram({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <span className={`${className} inline-flex items-center justify-center rounded-lg bg-[#0A1F38] border border-white/15 p-1 shadow-sm`}>
      <img src="/logo/kkn.webp" alt="Logo KKN Arutmin Asik 2026" className="h-full w-full object-contain" draggable={false} />
    </span>
  )
}
