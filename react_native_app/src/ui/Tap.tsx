import { Pressable, PressableProps } from 'react-native';

// Pressable dengan umpan balik tekan seragam (kartu dan baris yang bisa diketuk).
export function Tap({ style, ...p }: PressableProps) {
  return <Pressable accessibilityRole="button" {...p} style={(s) => [{ opacity: s.pressed ? 0.85 : 1 }, typeof style === 'function' ? style(s) : style]} />;
}
