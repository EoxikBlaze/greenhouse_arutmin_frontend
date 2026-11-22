import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { dark, fonts, light, Palette } from '@/theme/tokens';
import { useColors } from '@/theme/useColors';

// Skala tipografi dari .pen: judul/angka = Space Grotesk 700, isi = Inter.
// Ukuran: 11 tab · 13 caption/status · 14 meta/label/action · 16 body/wordmark · 18 section · 20 value · 26 title · 38 display.
// lineHeight ~1,3-1,5 agar teks yang membungkus tidak rapat (Apple: perbesar line height, jangan biarkan teks bertumpuk).
const make = (c: Palette) => ({
  wordmark: { fontFamily: fonts.display, fontSize: 16, lineHeight: 20, color: c.accent },
  display: { fontFamily: fonts.display, fontSize: 38, lineHeight: 44, color: c.textPrimary },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: c.textPrimary },
  section: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24, color: c.textPrimary },
  value: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, color: c.textPrimary },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: c.textSecondary },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 24, color: c.textPrimary },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20, color: c.textSecondary },
  meta: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: c.textSecondary },
  metaOnBg: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: c.textOnBg },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: c.textSecondary },
  status: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: c.warn },
  action: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20, color: c.accent },
  tab: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14, color: c.textSecondary },
} satisfies Record<string, TextStyle>);

const tables = { light: make(light), dark: make(dark) };

export type Variant = keyof ReturnType<typeof make>;

export function Text({ v = 'body', style, ...p }: TextProps & { v?: Variant }) {
  const c = useColors();
  return <RNText {...p} style={[tables[c === dark ? 'dark' : 'light'][v], style]} />;
}
