/** Atribut untuk elemen yang bisa ditekan (buka tautan) / ditahan (tampilkan penjelasan). */
export function info(judul: string, teks: string, href?: string) {
  return {
    'data-info-judul': judul,
    'data-info-teks': teks,
    ...(href ? { 'data-info-href': href } : {}),
    tabIndex: 0,
  } as const
}
