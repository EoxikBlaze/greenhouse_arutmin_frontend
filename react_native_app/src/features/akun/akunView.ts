export function validatePassword({ lama, baru, ulang }: { lama: string; baru: string; ulang: string }): string | null {
  if (!lama) return 'Isi kata sandi lama.';
  if (baru.length < 6) return 'Kata sandi baru minimal 6 karakter.';
  if (baru !== ulang) return 'Kata sandi baru tidak sama.';
  return null;
}

export function validateProfile({ username, email }: { username: string; email: string }): string | null {
  if (username.trim().length < 3) return 'Nama pengguna minimal 3 karakter.';
  if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Format email tidak valid.';
  return null;
}

// Backend hanya mengirim username (tanpa nama lengkap): "admin_vertonik" -> "Admin Vertonik".
export function displayName(username?: string | null): string {
  const words = (username ?? '').split(/[_\-.\s]+/).filter(Boolean);
  return words.length ? words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') : 'Pengguna';
}
