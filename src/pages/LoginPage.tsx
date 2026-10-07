import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Loader2, Lock, User } from 'lucide-react'

const FAILURE_KEY = 'nkk-login-failures'
const LOCK_KEY = 'nkk-login-lock-until'
const LOCK_DURATION_MS = 10_000

export const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
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
      localStorage.setItem('nkk-had-admin-session', 'true')
      navigate('/admin', { replace: true })
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

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
    <section className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
      <h1 className="text-center text-2xl font-bold tracking-tight">Masuk</h1>
      {errorMsg && <p role="alert" className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-center text-sm text-rose-200">{errorMsg}</p>}
      {remainingLockSeconds > 0 && <p className="mt-3 text-center text-sm text-slate-300">Coba lagi dalam {remainingLockSeconds} detik.</p>}
      <form onSubmit={(event) => { void handleSubmit(event) }} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold" htmlFor="username">Username
          <span className="relative mt-2 block"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input id="username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-3 text-base text-white outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30" required disabled={remainingLockSeconds > 0}/></span>
        </label>
        <label className="block text-sm font-semibold" htmlFor="password">Password
          <span className="relative mt-2 block"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-12 text-base text-white outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30" required disabled={remainingLockSeconds > 0}/><button type="button" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800">{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></span>
        </label>
        <button type="submit" disabled={isLoading || remainingLockSeconds > 0} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 font-semibold text-white hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? <><Loader2 className="h-4 w-4 animate-spin"/>Memeriksa...</> : 'Masuk'}</button>
      </form>
    </section>
  </main>
}
