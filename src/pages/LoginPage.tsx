import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, ShieldCheck, Sparkles, User } from 'lucide-react'

const FAILURE_KEY = 'nkk-login-failures'
const LOCK_KEY = 'nkk-login-lock-until'
const LOCK_DURATION_MS = 10_000

export const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [remainingLockSeconds, setRemainingLockSeconds] = useState(() => Math.max(0, Math.ceil((Number(localStorage.getItem(LOCK_KEY)) - Date.now()) / 1000)))
  const failuresRef = useRef(Number(localStorage.getItem(FAILURE_KEY)) || 0)

  useEffect(() => {
    document.title = 'Masuk | NKKSmart'
    let timer: number | undefined
    if (remainingLockSeconds > 0) {
      timer = window.setTimeout(() => setRemainingLockSeconds((value) => Math.max(0, value - 1)), 1000)
    } else {
      localStorage.removeItem(LOCK_KEY)
    }
    return () => { if (timer) window.clearTimeout(timer) }
  }, [remainingLockSeconds])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLoading || remainingLockSeconds > 0) return
    if (!username.trim() || !password) {
      setErrorMsg('Username atau password salah')
      return
    }

    setIsLoading(true)
    setErrorMsg('')
    const result = await login(username, password)
    if (result.ok) {
      localStorage.removeItem(FAILURE_KEY)
      const requestedPath = (location.state as { from?: unknown } | null)?.from
      const destination = typeof requestedPath === 'string' && requestedPath.startsWith('/') && !requestedPath.startsWith('//')
        ? requestedPath
        : '/admin'
      navigate(destination, { replace: true })
    } else {
      failuresRef.current += 1
      localStorage.setItem(FAILURE_KEY, String(failuresRef.current))
      setErrorMsg('Username atau password salah')
      if (failuresRef.current >= 3) {
        const until = Date.now() + LOCK_DURATION_MS
        localStorage.setItem(LOCK_KEY, String(until))
        setRemainingLockSeconds(Math.ceil(LOCK_DURATION_MS / 1000))
        failuresRef.current = 0
        localStorage.removeItem(FAILURE_KEY)
      }
    }
    setIsLoading(false)
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#100b11] p-4 text-slate-100 sm:p-8">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_15%,rgba(225,29,72,.24),transparent_38%),radial-gradient(ellipse_at_85%_90%,rgba(190,24,93,.17),transparent_36%)]" />
    <Link to="/" className="absolute left-5 top-5 z-10 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 text-sm font-semibold text-slate-300 transition hover:border-pink-400/50 hover:text-white"><ArrowLeft size={17}/>Kembali ke website</Link>
    <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/75 shadow-[0_30px_120px_rgba(0,0,0,.55)] backdrop-blur-xl md:grid-cols-[1fr_1fr]">
      <div className="relative hidden min-h-[610px] flex-col justify-between overflow-hidden border-r border-white/10 bg-gradient-to-br from-rose-950 via-[#21101d] to-slate-950 p-10 md:flex">
        <div aria-hidden="true" className="absolute -right-24 -top-20 h-80 w-80 rounded-full border border-pink-300/10 bg-pink-500/10 blur-2xl" />
        <div className="relative flex items-center gap-4"><img src="/assets/admin/nkk.png" alt="Logo Nihongo Kurabu Katsudo" className="h-16 w-16 rounded-2xl object-contain"/><div><p className="text-sm font-black tracking-[.18em] text-pink-300">NKKSMART</p><p className="mt-1 text-xs text-slate-400">Nihongo Kurabu Katsudo</p></div></div>
        <div className="relative"><span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-300/20 bg-pink-500/10 text-pink-300"><Sparkles size={22}/></span><h1 className="max-w-md text-4xl font-black leading-tight">Satu ruang untuk mengelola kegiatan klub.</h1><p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">Kelola anggota, pertemuan, presensi, kartu, dan laporan dalam satu dashboard.</p></div>
        <p className="relative text-xs text-slate-500">NIHONGO KURABU KATSUDO · ABSENSI EKSTRAKURIKULER</p>
      </div>
      <div className="flex min-h-[610px] flex-col justify-center p-6 sm:p-10 md:p-12">
        <div className="mb-8 flex items-center gap-3 md:hidden"><img src="/assets/admin/nkk.png" alt="Logo Nihongo Kurabu Katsudo" className="h-12 w-12 rounded-xl object-contain"/><div><p className="font-black text-pink-300">NKKSmart</p><p className="text-xs text-slate-400">Nihongo Kurabu Katsudo</p></div></div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-pink-300/20 bg-pink-500/10 px-3 py-1.5 text-xs font-bold text-pink-200"><ShieldCheck size={15}/>Akses khusus pengelola</span>
        <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Selamat datang</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Masuk dengan akun admin untuk melanjutkan ke dashboard.</p>
        {errorMsg && <p role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm leading-5 text-rose-200">{errorMsg}</p>}
        {remainingLockSeconds > 0 && <p className="mt-3 text-sm text-slate-300">Coba lagi dalam {remainingLockSeconds} detik.</p>}
        <form onSubmit={(event) => { void handleSubmit(event) }} className="mt-7 space-y-5">
          <label className="block text-sm font-semibold" htmlFor="username">Username atau email
            <span className="relative mt-2 block"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"/><input id="username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="min-h-[52px] w-full rounded-xl border border-slate-700/80 bg-slate-900/80 pl-10 pr-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10" required disabled={remainingLockSeconds > 0}/></span>
          </label>
          <label className="block text-sm font-semibold" htmlFor="password">Password
            <span className="relative mt-2 block"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"/><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-[52px] w-full rounded-xl border border-slate-700/80 bg-slate-900/80 pl-10 pr-12 text-base text-white outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10" required disabled={remainingLockSeconds > 0}/><button type="button" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1/2 flex h-11 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></span>
          </label>
          <button type="submit" disabled={isLoading || remainingLockSeconds > 0} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-4 font-bold text-white shadow-lg shadow-rose-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? <><Loader2 className="h-4 w-4 animate-spin"/>Memeriksa akun...</> : 'Masuk ke dashboard'}</button>
        </form>
        <p className="mt-6 text-center text-xs leading-5 text-slate-500">Sesi berlaku selama tab ini terbuka dan berakhir saat tab ditutup. Password tidak disimpan oleh aplikasi.</p>
      </div>
    </section>
  </main>
}
