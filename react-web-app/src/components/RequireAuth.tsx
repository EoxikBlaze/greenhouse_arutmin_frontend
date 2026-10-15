import type { ReactElement } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import type { Role } from '../lib/authTypes'

/**
 * Guard rute sesuai peta peran di untitled.pen:
 * - semua role  : Dashboard, Sensor, Tanam Saya, CCTV, Asisten AI, Profil, Logout
 * - admin+demo  : Water Control, Data Tahap, Durasi, Master, Laporan, Notif
 * - admin only  : Manajemen User
 * Mode demo = admin read-only (aksi destruktif dinonaktifkan di level komponen).
 */
export function RequireAuth({ allow, element }: { allow?: Role[]; element?: ReactElement }) {
  const { isAuthenticated, role } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allow && !allow.includes(role)) return <Navigate to="/dashboard" replace />
  if (element) return element
  return <Outlet />
}
