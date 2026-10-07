import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, isLoading } = useAuth()
  const hadAdminSession = localStorage.getItem('nkk-had-admin-session') === 'true'

  if (isLoading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-100"><div className="flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /><p className="text-sm text-slate-400">Memeriksa autentikasi...</p></div></div>
  }

  if (!user || !isAdmin) {
    return <Navigate to={hadAdminSession ? '/login' : '/'} replace />
  }

  return <>{children}</>
}
