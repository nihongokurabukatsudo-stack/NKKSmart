import React, { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute, PUBLIC_SITE_URL } from './components/layout/ProtectedRoute'
import { AdminLayout } from './components/layout/AdminLayout'
import { LoginPage } from './pages/LoginPage'
import { ScanPage } from './pages/ScanPage'
import { DashboardPage } from './pages/DashboardPage'
import { AnggotaPage } from './pages/AnggotaPage'
import { PengurusPage } from './pages/PengurusPage'
import { PertemuanPage } from './pages/PertemuanPage'
import { PertemuanDetailPage } from './pages/PertemuanDetailPage'
import { LokasiPage } from './pages/LokasiPage'
import { KartuPage } from './pages/KartuPage'
import { RekapPage } from './pages/RekapPage'
import { RekapBulananPage } from './pages/RekapBulananPage'
import { RekapSemesterPage } from './pages/RekapSemesterPage'
import { SettingsPage } from './pages/SettingsPage'
import { PendaftarPage } from './pages/PendaftarPage'

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } })

const HomeRedirect: React.FC = () => {
  const { user, isAdmin, isLoading } = useAuth()
  const hadAdminSession = localStorage.getItem('nkk-had-admin-session') === 'true'
  useEffect(() => {
    if (!isLoading && (!user || !isAdmin) && !hadAdminSession) window.location.replace(PUBLIC_SITE_URL)
  }, [hadAdminSession, isAdmin, isLoading, user])
  if (isLoading) return <div className="min-h-screen bg-slate-950" />
  if (user && isAdmin) return <Navigate to="/admin" replace />
  if (hadAdminSession) return <Navigate to="/login" replace />
  return <div className="min-h-screen bg-slate-950" aria-label="Mengalihkan ke situs resmi" />
}

const NotFound: React.FC = () => <main className="min-h-screen bg-slate-950 p-8 text-slate-100"><h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1><p className="mt-2 text-slate-300">Alamat yang dibuka tidak tersedia.</p></main>
const LegacyMeetingRedirect: React.FC = () => { const { id } = useParams(); return <Navigate to={`/admin/pertemuan/${id}`} replace /> }

export const App: React.FC = () => <QueryClientProvider client={queryClient}>
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="anggota" element={<AnggotaPage />} />
          <Route path="pengurus" element={<PengurusPage />} />
          <Route path="pertemuan" element={<PertemuanPage />} />
          <Route path="pertemuan/:id" element={<PertemuanDetailPage />} />
          <Route path="lokasi" element={<LokasiPage />} />
          <Route path="kartu" element={<KartuPage />} />
          <Route path="rekap" element={<RekapPage />} />
          <Route path="rekap-bulanan" element={<RekapBulananPage />} />
          <Route path="rekap-semester" element={<RekapSemesterPage />} />
          <Route path="pendaftar" element={<PendaftarPage />} />
          <Route path="pengaturan" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/scan" element={<Navigate to="/admin/scan" replace />} />
        <Route path="/anggota" element={<Navigate to="/admin/anggota" replace />} />
        <Route path="/pengurus" element={<Navigate to="/admin/pengurus" replace />} />
        <Route path="/pertemuan" element={<Navigate to="/admin/pertemuan" replace />} />
        <Route path="/pertemuan/:id" element={<LegacyMeetingRedirect />} />
        <Route path="/lokasi" element={<Navigate to="/admin/lokasi" replace />} />
        <Route path="/kartu" element={<Navigate to="/admin/kartu" replace />} />
        <Route path="/rekap" element={<Navigate to="/admin/rekap" replace />} />
        <Route path="/rekap-bulanan" element={<Navigate to="/admin/rekap-bulanan" replace />} />
        <Route path="/rekap-semester" element={<Navigate to="/admin/rekap-semester" replace />} />
        <Route path="/pengaturan" element={<Navigate to="/admin/pengaturan" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
</QueryClientProvider>

export default App
