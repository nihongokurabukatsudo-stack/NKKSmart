import React, { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard,
  QrCode,
  Users,
  UserCheck,
  CalendarDays,
  MapPin,
  CreditCard,
  FileSpreadsheet,
  CalendarRange,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Sun,
  Moon,
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/anggota', label: 'Data Anggota', icon: Users },
  { path: '/pengurus', label: 'Data Pengurus', icon: UserCheck },
  { path: '/pertemuan', label: 'Jadwal Pertemuan', icon: CalendarDays },
  { path: '/lokasi', label: 'Lokasi & Geofence', icon: MapPin },
  { path: '/kartu', label: 'Cetak Kartu', icon: CreditCard },
  { path: '/rekap', label: 'Rekap Absensi', icon: FileSpreadsheet },
  { path: '/rekap-bulanan', label: 'Rekap Bulanan', icon: CalendarRange },
  { path: '/pengaturan', label: 'Pengaturan', icon: Settings },
]

export const AdminLayout: React.FC = () => {
  const { adminProfile, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('nkk-theme')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('nkk-theme', dark ? 'dark' : 'light')
  }, [dark])

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin logout?')) {
      await logout()
      navigate('/login')
    }
  }

  return (
    <div className="admin-shell min-h-screen flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <header className="md:hidden flex items-center justify-between p-4 bg-slate-800/80 backdrop-blur border-b border-slate-700/50 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img src="/img/nkk.png" alt="NKK" className="w-8 h-8 object-contain" />
          <span className="font-bold text-lg tracking-wider text-emerald-400">NKKSmart</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700/50"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar for Desktop */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-800/90 border-r border-slate-700/50 flex flex-col transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="p-5 flex items-center gap-3 border-b border-slate-700/50">
          <img src="/img/nkk.png" alt="NKK" className="w-9 h-9 object-contain" />
          <div>
            <h1 className="font-bold text-lg text-emerald-400 leading-tight">NKKSmart</h1>
            <p className="text-xs text-slate-400">Absensi Ekstrakurikuler</p>
          </div>
        </div>

        {/* Public Scanner Quick Link */}
        <div className="p-3">
          <Link
            to="/scan"
            target="_blank"
            className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-900/30 text-sm font-semibold transition"
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              <span>Buka Kamera Scan</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Info & Logout Footer */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/40 flex items-center justify-between">
          <div className="overflow-hidden pr-2">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {adminProfile?.full_name || 'Admin'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              @{adminProfile?.username || 'admin'}
            </p>
          </div>
          <div className="flex items-center gap-1">
          <button onClick={() => setDark(!dark)} title={dark ? 'Mode terang' : 'Mode gelap'} className="min-h-11 min-w-11 rounded-lg p-2 text-slate-300 hover:bg-slate-700/50" aria-label={dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* Main Content Area */}
      <main className="admin-main flex-1 min-w-0 p-4 sm:p-6 md:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
