import { Ikon } from './Ikon'

/**
 * Banner mode demo — menjelaskan bahwa akun Demo hanya menerima & melihat data.
 */
export function DemoBanner({ demo }: { demo: boolean }) {
  if (!demo) return null
  return (
    <div
      className="vsf-banner flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-arutmin-border2 bg-[linear-gradient(90deg,rgba(233,205,83,.30)_0%,rgba(207,226,206,.55)_45%,rgba(244,247,242,.9)_100%)] px-4 py-2 text-[13px] text-arutmin-forest shadow-[0_10px_24px_-22px_rgba(7,21,39,.9)]"
      role="status"
      aria-live="polite"
    >
      <span className="vsf-eyebrow vsf-eyebrow-emas inline-flex items-center gap-1.5 rounded-full bg-navy px-2.5 py-0.5">
        <Ikon nama="peringatan" className="h-3 w-3" />
        Demo
      </span>
      {/* Sesuai kebijakan server: demo boleh mencoba MENAMBAH data, tetapi tidak mengubah, menghapus, atau mengendalikan alat. */}
      <span className="sm:hidden">Boleh mencoba menambah data; tidak bisa mengubah, menghapus, atau mengendalikan alat.</span>
      <span className="hidden sm:inline">
        <b>Mode Demo:</b> Akun ini boleh melihat pantauan kebun dan mencoba menambah data, tetapi tidak dapat mengubah, menghapus,
        atau mengendalikan alat.
      </span>
    </div>
  )
}
