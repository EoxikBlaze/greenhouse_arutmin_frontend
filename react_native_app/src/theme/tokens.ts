// Token dari GARAP Mobile — Blue Greenhouse v2 (.pen). Jangan ubah tanpa mengubah desain.
export const colors = {
  surface: '#FFFFFF',
  surfaceSoft: '#EEF4F0',
  textPrimary: '#12211A',
  textSecondary: '#556B5E',
  accent: '#1E7A55',
  accentSoft: '#E4F1EB',
  danger: '#B3261E',
  dangerSoft: '#FBEAE8',
  warn: '#8A5A00',
  warnSoft: '#FFF3DC',
  info: '#12507F',
  infoSoft: '#E3F0F9',
  border: '#D8E3DB',
  bgScreen: '#B7E2F9',
  onAccent: '#FFFFFF',
} as const;

export const radius = { card: 20, input: 12, dock: 31, dockItem: 24 } as const;
export const space = { screen: 16, gap: 16, gapSm: 12 } as const;

export const fonts = {
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  display: 'SpaceGrotesk_700Bold',
} as const;

// Bayangan kartu: #0B2A1B alpha 0x14 (~8%), y=2, blur=14.
export const shadowCard = {
  shadowColor: '#0B2A1B',
  shadowOpacity: 0x14 / 0xff,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 14,
  elevation: 2,
} as const;

// Dock melayang: #0B2A1B alpha 0x26, y=6, blur=18.
export const shadowDock = {
  shadowColor: '#0B2A1B',
  shadowOpacity: 0x26 / 0xff,
  shadowOffset: { width: 0, height: 6 },
  shadowRadius: 18,
  elevation: 8,
} as const;
