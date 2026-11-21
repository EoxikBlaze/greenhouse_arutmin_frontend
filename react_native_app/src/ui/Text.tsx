import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { colors, fonts } from '@/theme/tokens';

// Gaya teks dari .pen: judul/angka = Space Grotesk 700, isi = Inter.
const variants = {
  wordmark: { fontFamily: fonts.display, fontSize: 16, color: colors.accent },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.textPrimary },
  section: { fontFamily: fonts.display, fontSize: 18, color: colors.textPrimary },
  value: { fontFamily: fonts.display, fontSize: 20, color: colors.textPrimary },
  body: { fontFamily: fonts.body, fontSize: 16, color: colors.textSecondary },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textSecondary },
  meta: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  status: { fontFamily: fonts.body, fontSize: 13, color: colors.warn },
  action: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accent },
} satisfies Record<string, TextStyle>;

export type Variant = keyof typeof variants;

export function Text({ v = 'body', style, ...p }: TextProps & { v?: Variant }) {
  return <RNText {...p} style={[variants[v], style]} />;
}
