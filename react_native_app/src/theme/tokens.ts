// Token dari GARAP Mobile — Blue Greenhouse v2 (.pen). Jangan ubah tanpa mengubah desain.
export const light = {
  surface: '#FFFFFF',
  surfaceSoft: '#EEF4F0',
  textPrimary: '#12211A',
  textSecondary: '#556B5E',
  // textSecondary jatuh ke 4,2:1 di atas bgScreen (#B7E2F9); teks yang berdiri langsung di latar memakai ini (5,9:1).
  textOnBg: '#3E5547',
  accent: '#1E7A55',
  accentSoft: '#E4F1EB',
  danger: '#B3261E',
  dangerSoft: '#FBEAE8',
  warn: '#8A5A00',
  warnSoft: '#FFF3DC',
  info: '#12507F',
  infoSoft: '#E3F0F9',
  border: '#D8E3DB',
  // Rel saklar mati: >= 3:1 di atas surface (batas komponen non-teks WCAG).
  control: '#7C9285',
  bgScreen: '#B7E2F9',
  onAccent: '#FFFFFF',
};

export type Palette = Record<keyof typeof light, string>;

// Mode gelap: tidak ada di .pen, diturunkan dari palet terang (kontras teks >= 6,6:1 di atas permukaannya).
export const dark: Palette = {
  surface: '#16262F',
  surfaceSoft: '#1E3340',
  textPrimary: '#E8F1EC',
  textSecondary: '#A8BDB1',
  textOnBg: '#A8BDB1',
  accent: '#5FD3A0',
  accentSoft: '#1A3A2E',
  danger: '#FF9187',
  dangerSoft: '#3B1F1D',
  warn: '#F0BC57',
  warnSoft: '#3A2E14',
  info: '#86C5F2',
  infoSoft: '#17313F',
  border: '#2B4250',
  control: '#5C7686',
  bgScreen: '#0D1B26',
  onAccent: '#04241A',
};

export const radius = { sm: 8, card: 20, input: 12, dock: 31, dockItem: 24, pill: 999 } as const;
// Skala jarak 4-pt untuk komponen baru. Gap dalam komponen lama mengikuti .pen (2/4/6/8/10/12/16).
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, screen: 16, gap: 16, gapSm: 12 } as const;
// Ukuran ikon Lucide: sm di chip, md inline, lg ikon utama/nav, xl status kosong.
export const icon = { sm: 16, md: 20, lg: 24, xl: 32 } as const;

export const fonts = {
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  display: 'SpaceGrotesk_700Bold',
} as const;

// Dock melayang: #0B2A1B alpha 0x26, y=6, blur=18.
export const shadowDock = {
  shadowColor: '#0B2A1B',
  shadowOpacity: 0x26 / 0xff,
  shadowOffset: { width: 0, height: 6 },
  shadowRadius: 18,
  elevation: 8,
} as const;
