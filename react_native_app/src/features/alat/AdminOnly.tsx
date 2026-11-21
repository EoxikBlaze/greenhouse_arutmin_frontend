import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/features/auth/AuthProvider';

// Tab Alat disembunyikan untuk non-admin, tetapi rute turunannya tetap bisa dibuka lewat URL.
export function AdminOnly({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  return role === 'admin' ? <>{children}</> : <Redirect href="/" />;
}
