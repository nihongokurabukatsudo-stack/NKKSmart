import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AdminLayout } from './components/layout/AdminLayout'

// Pages
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/scan" element={<ScanPage />} />

            {/* Protected Admin Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="anggota" element={<AnggotaPage />} />
              <Route path="pengurus" element={<PengurusPage />} />
              <Route path="pertemuan" element={<PertemuanPage />} />
              <Route path="pertemuan/:id" element={<PertemuanDetailPage />} />
              <Route path="lokasi" element={<LokasiPage />} />
              <Route path="kartu" element={<KartuPage />} />
              <Route path="rekap" element={<RekapPage />} />
              <Route path="rekap-bulanan" element={<RekapBulananPage />} />
              <Route path="rekap-semester" element={<RekapSemesterPage />} />
              <Route path="pengaturan" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
