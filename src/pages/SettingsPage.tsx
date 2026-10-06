import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Settings,
  Lock,
  Download,
  Shield,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  User,
} from 'lucide-react'

export const SettingsPage: React.FC = () => {
  const { adminProfile, user } = useAuth()

  // Change Password State
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [pwdError, setPwdError] = useState('')

  // Backup State
  const [isExportingBackup, setIsExportingBackup] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdSuccess('')
    setPwdError('')

    if (newPassword.length < 6) {
      setPwdError('Password minimal 6 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Konfirmasi password tidak cocok.')
      return
    }

    setIsChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setPwdSuccess('Password berhasil diperbarui. Silakan gunakan password baru ini pada login berikutnya.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setPwdError(err instanceof Error ? err.message : 'Gagal mengubah password.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Backup JSON export
  const handleExportBackupJSON = async () => {
    setIsExportingBackup(true)
    try {
      const [anggotaRes, barcodeRes, pertemuanRes, absensiRes, geoRes] = await Promise.all([
        supabase.from('anggota').select('*'),
        supabase.from('barcode').select('*'),
        supabase.from('pertemuan').select('*'),
        supabase.from('absensi').select('*'),
        supabase.from('geofence_settings').select('*'),
      ])

      const backupData = {
        meta: {
          app: 'NKKSmart',
          version: '2.0.0',
          exported_at: new Date().toISOString(),
          exported_by: adminProfile?.username || 'admin',
        },
        data: {
          anggota: anggotaRes.data || [],
          barcode: barcodeRes.data || [],
          pertemuan: pertemuanRes.data || [],
          absensi: absensiRes.data || [],
          geofence_settings: geoRes.data || [],
        },
      }

      const jsonStr = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-nkksmart-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Backup error:', err)
      alert('Gagal mengekspor data backup.')
    } finally {
      setIsExportingBackup(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-pink-400" />
          <span>Pengaturan Akun & Sistem</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Kelola kredensial admin, unduh backup data, dan informasi sistem
        </p>
      </div>

      {/* Profil Admin Card */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-pink-400" />
          <span>Informasi Akun Admin Aktif</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5">Nama Lengkap</span>
            <span className="font-semibold text-white text-sm">{adminProfile?.full_name || '-'}</span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5">Username</span>
            <span className="font-semibold text-white text-sm">@{adminProfile?.username || '-'}</span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5">Email Supabase Auth</span>
            <span className="font-mono text-slate-300">{user?.email || '-'}</span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5">Terakhir Login</span>
            <span className="text-slate-300">
              {adminProfile?.last_login ? new Date(adminProfile.last_login).toLocaleString('id-ID') : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Ganti Password Form */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-pink-400" />
          <span>Ubah Password Admin</span>
        </h2>

        {pwdSuccess && (
          <div className="p-3.5 bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{pwdSuccess}</span>
          </div>
        )}

        {pwdError && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{pwdError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs max-w-md">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-pink-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-pink-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-xl font-semibold shadow-md shadow-pink-900/30 transition cursor-pointer"
          >
            {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            <span>Simpan Password Baru</span>
          </button>
        </form>
      </div>

      {/* Backup Data Card */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-pink-400" />
          <span>Cadangan & Ekspor Data (Backup)</span>
        </h2>

        <p className="text-xs text-slate-300 leading-relaxed">
          Unduh salinan cadangan seluruh tabel sistem (Anggota, Barcode, Pertemuan, Absensi, dan Geofence) dalam format JSON terstruktur untuk arsip berkala.
        </p>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleExportBackupJSON}
            disabled={isExportingBackup}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-pink-900/30 transition cursor-pointer"
          >
            {isExportingBackup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Unduh Cadangan Lengkap (.JSON)</span>
          </button>
        </div>

        <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>
            Database PostgreSQL Supabase juga otomatis menyediakan snapshot backup harian melalui dashboard Supabase.
          </span>
        </div>
      </div>
    </div>
  )
}

