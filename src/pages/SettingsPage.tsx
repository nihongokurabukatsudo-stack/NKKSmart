import React, { useEffect, useState } from 'react'
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
  const [documentationTitle, setDocumentationTitle] = useState('Panduan NKKSmart')
  const [documentationBody, setDocumentationBody] = useState('')
  const [isLoadingDocumentation, setIsLoadingDocumentation] = useState(true)
  const [isSavingDocumentation, setIsSavingDocumentation] = useState(false)
  const [documentationMessage, setDocumentationMessage] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const { data, error } = await (supabase.from('app_settings' as never) as any)
          .select('value').eq('key', 'admin_documentation').maybeSingle()
        if (error) throw error
        if (active && data?.value) {
          setDocumentationTitle(typeof data.value.title === 'string' ? data.value.title : 'Panduan NKKSmart')
          setDocumentationBody(typeof data.value.body === 'string' ? data.value.body : '')
        }
      } catch {
        if (active) setDocumentationMessage('Dokumentasi belum dapat dimuat. Pastikan schema app_settings sudah diterapkan.')
      } finally {
        if (active) setIsLoadingDocumentation(false)
      }
    })()
    return () => { active = false }
  }, [])

  const handleSaveDocumentation = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingDocumentation(true)
    setDocumentationMessage('')
    try {
      const { error } = await (supabase.from('app_settings' as never) as any).upsert({
        key: 'admin_documentation',
        value: { title: documentationTitle.trim(), body: documentationBody, updated_at: new Date().toISOString() },
      }, { onConflict: 'key' })
      if (error) throw error
      setDocumentationMessage('Dokumentasi berhasil disimpan.')
    } catch (err: unknown) {
      setDocumentationMessage(err instanceof Error ? err.message : 'Gagal menyimpan dokumentasi. Pastikan schema app_settings dan akses admin aktif.')
    } finally {
      setIsSavingDocumentation(false)
    }
  }

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

      {/* Admin-editable project documentation */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2"><Info className="w-4 h-4 text-pink-400"/><span>Dokumentasi Project</span></h2>
        <p className="text-xs leading-relaxed text-slate-300">Atur panduan yang ingin disertakan untuk admin/operator project. Konten tersimpan di Supabase dan tidak mencakup data anggota.</p>
        {documentationMessage && <p role="status" className="rounded-lg border border-pink-500/20 bg-pink-500/10 p-3 text-xs text-pink-200">{documentationMessage}</p>}
        <form onSubmit={handleSaveDocumentation} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-300">Judul panduan<input value={documentationTitle} onChange={(event) => setDocumentationTitle(event.target.value)} maxLength={120} required className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"/></label>
          <label className="block text-xs font-semibold text-slate-300">Isi dokumentasi<textarea value={documentationBody} onChange={(event) => setDocumentationBody(event.target.value)} maxLength={20000} rows={10} placeholder="Tulis langkah setup, cara pakai dashboard, atau catatan deployment…" className="mt-1.5 w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm leading-6 text-white placeholder:text-slate-500"/></label>
          <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={isSavingDocumentation || isLoadingDocumentation} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-pink-600 px-4 text-xs font-bold text-white disabled:opacity-50">{isSavingDocumentation ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4"/>}Simpan dokumentasi</button>{isLoadingDocumentation && <span className="text-xs text-slate-400">Memuat panduan…</span>}</div>
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
