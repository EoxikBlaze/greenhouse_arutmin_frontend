import { useCountUp } from '../lib/useCountUp'

/** Angka KPI yang bergeser mulus saat nilainya berubah; "—" bila kosong. */
export function AngkaHidup({ nilai, digit = 0, akhiran = '' }: { nilai: number | null; digit?: number; akhiran?: string }) {
  const v = useCountUp(nilai)
  if (v === null) return <>—{akhiran}</>
  return <>{v.toFixed(digit)}{akhiran}</>
}
