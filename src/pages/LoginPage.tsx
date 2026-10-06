import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Lock, User, LogIn, Loader2, ArrowLeft, QrCode } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const { login, user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Redirect if already logged in as admin
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
  React.useEffect(() => {
    if (user && isAdmin) {
      navigate(from, { replace: true })
    }
  }, [user, isAdmin, navigate, from])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setErrorMsg('Username dan password wajib diisi.')
      return
    }

    setIsLoading(true)
    setErrorMsg('')

    const res = await login(username, password)
    setIsLoading(false)

    if (res.ok) {
      navigate(from, { replace: true })
    } else {
      setErrorMsg(res.error || 'Login gagal. Periksa username dan password.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md relative z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <img src="/img/nkk.png" alt="NKKSmart" className="w-16 h-16 object-contain mb-3 drop-shadow" />
          <h2 className="text-2xl font-bold text-white tracking-tight">Login Administrator</h2>
          <p className="text-xs text-slate-400 mt-1">Sistem Absensi Ekstrakurikuler NKKSmart</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Username atau Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: faaiz / adan"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-pink-600 to-pink-600 hover:from-pink-500 hover:to-pink-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-pink-900/30 transition cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Masuk ke Dashboard</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <Link
            to="/scan"
            className="text-pink-400 hover:text-pink-300 flex items-center gap-1.5 transition"
          >
            <QrCode className="w-4 h-4" />
            <span>Kamera Scan Publik</span>
          </Link>
          <span className="text-slate-500 text-[11px]">v2.0 Vite + Supabase</span>
        </div>
      </div>
    </div>
  )
}

