import React, { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
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
import hiraganaCharacters from './data/hiragana.json'
import katakanaCharacters from './data/katakana.json'
import { AboutPage } from './pages/AboutPage'
import { CoreTeamPage } from './pages/CoreTeamPage'
import { GalleryPage } from './pages/GalleryPage'
import { KanaLearningPage } from './pages/KanaLearningPage'
import { KanaQuizPage } from './pages/KanaQuizPage'
import { LandingPage } from './pages/LandingPage'
import { RegisterPage } from './pages/RegisterPage'

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } })

const RouteRobots: React.FC = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (pathname === '/login' || pathname.startsWith('/admin')) {
      if (!robots) {
        robots = document.createElement('meta')
        robots.name = 'robots'
        document.head.appendChild(robots)
      }
      robots.content = 'noindex, nofollow'
    } else {
      robots?.remove()
    }
  }, [pathname])
  return null
}

const NotFound: React.FC = () => <main className="min-h-screen bg-slate-950 p-8 text-slate-100"><h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1><p className="mt-2 text-slate-300">Alamat yang dibuka tidak tersedia.</p><a className="mt-4 inline-block text-pink-300 underline" href="/">Kembali ke beranda</a></main>
const LegacyMeetingRedirect: React.FC = () => { const { id } = useParams(); return <Navigate to={`/admin/pertemuan/${id}`} replace /> }

export const App: React.FC = () => <QueryClientProvider client={queryClient}>
  <AuthProvider>
    <BrowserRouter>
      <RouteRobots />
      <Routes>
        {/* Website resmi publik */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/tentang" element={<AboutPage />} />
        <Route path="/tim-inti" element={<CoreTeamPage />} />
        <Route path="/galeri" element={<GalleryPage />} />
        <Route path="/belajar/hiragana" element={<KanaLearningPage title="Hiragana" kanaCharacters={hiraganaCharacters} quizPath="/belajar/hiragana/quiz" description={[
          'Hiragana adalah salah satu sistem tulisan dasar bahasa Jepang yang dipakai untuk menulis kata asli Jepang, partikel, akhiran kata kerja, dan bacaan tambahan.',
          'Huruf ini biasanya menjadi langkah pertama saat belajar bahasa Jepang karena bentuknya sering muncul dalam kalimat sehari-hari.',
        ]} />} />
        <Route path="/belajar/hiragana/quiz" element={<KanaQuizPage title="Hiragana" kanaCharacters={hiraganaCharacters} learningPath="/belajar/hiragana" />} />
        <Route path="/belajar/katakana" element={<KanaLearningPage title="Katakana" kanaCharacters={katakanaCharacters} quizPath="/belajar/katakana/quiz" description={[
          'Katakana adalah sistem tulisan Jepang yang umumnya digunakan untuk kata serapan dari bahasa asing, nama luar Jepang, istilah modern, dan penekanan tertentu.',
          'Bentuk Katakana lebih tegas dan bersudut, sehingga mudah dibedakan dari Hiragana ketika membaca teks Jepang.',
        ]} />} />
        <Route path="/belajar/katakana/quiz" element={<KanaQuizPage title="Katakana" kanaCharacters={katakanaCharacters} learningPath="/belajar/katakana" />} />

        {/* Dashboard admin pada aplikasi dan domain yang sama */}
        <Route path="/login" element={<LoginPage />} />
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

        {/* Alamat lama dashboard tetap diarahkan ke route baru */}
        <Route path="/scan" element={<ScanPage />} />
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
