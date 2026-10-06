import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  MapPin,
  Save,
  Crosshair,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'

export const LokasiPage: React.FC = () => {
  const [lat, setLat] = useState<string>('')
  const [lng, setLng] = useState<string>('')
  const [radius, setRadius] = useState<number>(600)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [successMsg, setSuccessMsg] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')

  const fetchGeofence = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('geofence_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()

      if (!error && data) {
        setLat(data.lat !== null ? data.lat.toString() : '')
        setLng(data.lng !== null ? data.lng.toString() : '')
        setRadius(data.radius || 600)
        setUpdatedAt(data.updated_at)
      }
    } catch (err) {
      console.error('Error fetching geofence:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGeofence()
  }, [])

  // Dapatkan Lokasi GPS Perangkat Saat Ini
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung Geolocation GPS.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(7))
        setLng(pos.coords.longitude.toFixed(7))
        setSuccessMsg('Koordinat lokasi saat ini berhasil diambil.')
        setTimeout(() => setSuccessMsg(''), 4000)
      },
      (err) => {
        alert(`Gagal mengambil koordinat: ${err.message}`)
      },
      { enableHighAccuracy: true }
    )
  }

  // Simpan Pengaturan
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    const parsedLat = lat.trim() !== '' ? parseFloat(lat) : null
    const parsedLng = lng.trim() !== '' ? parseFloat(lng) : null

    if ((parsedLat === null && parsedLng !== null) || (parsedLat !== null && parsedLng === null)) {
      setErrorMsg('Latitude dan Longitude harus diisi keduanya atau dikosongkan keduanya.')
      setIsSaving(false)
      return
    }

    try {
      const { error } = await supabase
        .from('geofence_settings')
        .upsert({
          id: 1,
          lat: parsedLat,
          lng: parsedLng,
          radius: radius,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      setSuccessMsg('Pengaturan geofence berhasil disimpan.')
      await fetchGeofence()
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: unknown) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.')
    } finally {
      setIsSaving(false)
    }
  }

  // Nonaktifkan Geofence
  const handleDisableGeofence = async () => {
    if (!window.confirm('Nonaktifkan geofence? Siswa akan dapat absen dari lokasi mana pun tanpa batasan jarak.')) {
      return
    }

    setIsSaving(true)
    try {
      await supabase
        .from('geofence_settings')
        .update({
          lat: null,
          lng: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1)

      setLat('')
      setLng('')
      setSuccessMsg('Geofence dinonaktifkan (Scan diizinkan dari mana saja).')
      await fetchGeofence()
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      console.error(err)
      alert('Gagal menonaktifkan geofence.')
    } finally {
      setIsSaving(false)
    }
  }

  const isConfigured = lat !== '' && lng !== ''

  return (
    <div className="max-w-2xl space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <MapPin className="w-6 h-6 text-pink-400" />
          <span>Pengaturan Lokasi & Geofence</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Tentukan titik pusat sekolah dan radius maksimal untuk membatasi scan absensi
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Geofence Form Card */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm">
        {isLoading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
            <p className="text-xs">Memuat pengaturan lokasi...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5 text-xs">
            {/* Status Info */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isConfigured
                  ? 'bg-pink-500/10 border-pink-500/30 text-pink-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div>
                <span className="font-bold">Status Geofence:</span>{' '}
                {isConfigured ? 'Aktif (Dibatasi Radius)' : 'Nonaktif (Scan Bebas)'}
                {updatedAt && (
                  <p className="text-[10px] opacity-75 mt-0.5">
                    Terakhir diperbarui: {new Date(updatedAt).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5 text-pink-400" />
                <span>GPS Saya</span>
              </button>
            </div>

            {/* Latitude & Longitude Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Latitude (Lintang)
                </label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="-6.914744"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Longitude (Bujur)
                </label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="107.609810"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>
            </div>

            {/* Radius Slider / Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-300 font-semibold">Radius Toleransi (Meter)</label>
                <span className="font-mono text-pink-400 font-bold">{radius} m</span>
              </div>
              <input
                type="range"
                min="50"
                max="5000"
                step="50"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Jarak maksimal pengguna dari koordinat sekolah agar absensi diizinkan (default: 600m).
              </p>
            </div>

            {/* Google Maps Link */}
            {isConfigured && (
              <div className="pt-2">
                <a
                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-pink-400 hover:text-pink-300 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Titik Koordinat di Google Maps</span>
                </a>
              </div>
            )}

            {/* Form Actions */}
            <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between">
              {isConfigured ? (
                <button
                  type="button"
                  onClick={handleDisableGeofence}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 rounded-xl font-medium transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Nonaktifkan Geofence</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-xl font-semibold shadow-md shadow-pink-900/30 transition cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

