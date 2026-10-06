import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Html5Qrcode, type Html5QrcodeCameraScanConfig } from 'html5-qrcode'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  calculateDistanceMeters,
  playSynthesizedBeep,
} from '../lib/utils'
import {
  Camera,
  CameraOff,
  FlipHorizontal,
  RefreshCw,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  ShieldCheck,
  Send,
  ArrowLeft,
} from 'lucide-react'

interface MeetingStatus {
  active: boolean
  status: 'active' | 'libur' | 'manual' | 'inactive' | 'no_meeting'
  meeting: {
    id: number
    nama_pertemuan: string
    pertemuan_ke: number
    tanggal: string
    jam_mulai_scan: string
    jam_akhir_scan: string
    manual_active: boolean
    status: string
  } | null
  message: string
}

interface GeofenceConfig {
  configured: boolean
  lat?: number
  lng?: number
  radius?: number
  message?: string
}

interface ScanLogEntry {
  id: string
  time: string
  nama?: string
  kelas?: string
  status: 'success' | 'warning' | 'error'
  message: string
}

interface ScanPopupData {
  show: boolean
  success: boolean
  nama?: string
  kelas?: string
  jabatan?: string
  message: string
  time?: string
}

export const ScanPage: React.FC = () => {
  const { isAdmin } = useAuth()

  // State Scanner
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [isMirrored, setIsMirrored] = useState<boolean>(false)
  const [scanType, setScanType] = useState<'auto' | 'anggota' | 'pengurus'>('auto')

  // Meeting & Geo State
  const [meetingStatus, setMeetingStatus] = useState<MeetingStatus | null>(null)
  const [geofence, setGeofence] = useState<GeofenceConfig | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [isInsideFence, setIsInsideFence] = useState<boolean>(true)
  const [geoError, setGeoError] = useState<string | null>(null)

  // Manual Input State
  const [manualCode, setManualCode] = useState<string>('')
  const [isSubmittingManual, setIsSubmittingManual] = useState<boolean>(false)

  // Scan Result & Logs
  const [popup, setPopup] = useState<ScanPopupData>({ show: false, success: false, message: '' })
  const [logs, setLogs] = useState<ScanLogEntry[]>([])

  // Refs
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const lastCodeRef = useRef<string>('')
  const lockRef = useRef<boolean>(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Init notification audio
  useEffect(() => {
    const audio = new Audio('/audio/notif.mp3')
    audio.preload = 'auto'
    audioRef.current = audio
  }, [])

  const playNotificationSound = (success: boolean) => {
    if (audioRef.current && success) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => playSynthesizedBeep(success))
    } else {
      playSynthesizedBeep(success)
    }
  }

  // 1. Polling Status Pertemuan
  const fetchMeetingStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_scan_status')
      if (!error && data) {
        setMeetingStatus(data as MeetingStatus)
      }
    } catch (e) {
      console.error('Error fetching meeting status:', e)
    }
  }

  // 2. Fetch Geofence Settings & Monitor GPS
  const fetchGeofence = async () => {
    try {
      const { data, error } = await supabase.rpc('get_geofence')
      if (!error && data) {
        setGeofence(data as GeofenceConfig)
      }
    } catch (e) {
      console.error('Error fetching geofence:', e)
    }
  }

  useEffect(() => {
    fetchMeetingStatus()
    fetchGeofence()

    const interval = setInterval(fetchMeetingStatus, 8000)
    return () => clearInterval(interval)
  }, [])

  // Geolocation tracking
  useEffect(() => {
    if (!geofence || !geofence.configured || !geofence.lat || !geofence.lng) {
      setIsInsideFence(true)
      return
    }

    if (!navigator.geolocation) {
      setGeoError('GPS tidak didukung oleh browser Anda')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const userLat = pos.coords.latitude
        const userLng = pos.coords.longitude
        setUserLocation({ lat: userLat, lng: userLng })

        const dist = calculateDistanceMeters(userLat, userLng, geofence.lat!, geofence.lng!)
        setDistance(dist)
        setIsInsideFence(dist <= (geofence.radius || 600))
        setGeoError(null)
      },
      (err) => {
        console.warn('Geolocation warning:', err.message)
        setGeoError('Gagal mengakses GPS. Pastikan izin lokasi aktif.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [geofence])

  // Get Camera Devices
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices)
          // Default to back camera if available
          const backCam = devices.find((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('belakang'))
          setSelectedCameraId(backCam ? backCam.id : devices[0].id)
        }
      })
      .catch((err) => {
        console.warn('Tidak dapat menemukan kamera:', err)
      })
  }, [])

  // Submit Scan ke RPC Supabase
  const handleProcessScan = async (rawCode: string, mode: 'camera' | 'manual' = 'camera') => {
    const code = rawCode.trim()
    if (!code) return

    // Cek Geofence jika kamera
    if (mode === 'camera' && geofence?.configured && !isInsideFence) {
      playNotificationSound(false)
      setPopup({
        show: true,
        success: false,
        message: `Lokasi Anda di luar radius presensi (${distance}m > ${geofence.radius}m).`,
      })
      return
    }

    try {
      const { data, error } = await (supabase.rpc as any)('submit_scan', {
        kode: code,
        scan_type: scanType,
        mode: mode,
      })

      if (error) {
        playNotificationSound(false)
        setPopup({
          show: true,
          success: false,
          message: error.message || 'Gagal memproses absensi.',
        })
        addLog({ status: 'error', message: error.message || 'Error RPC' })
        return
      }

      const res = data as {
        ok: boolean
        message: string
        nama?: string
        kelas?: string
        jabatan?: string
        waktu_scan?: string
      }

      playNotificationSound(res.ok)

      if (res.ok) {
        setPopup({
          show: true,
          success: true,
          nama: res.nama,
          kelas: res.kelas,
          jabatan: res.jabatan,
          message: res.message || 'Absensi berhasil',
          time: res.waktu_scan,
        })
        addLog({
          status: 'success',
          nama: res.nama,
          kelas: res.kelas,
          message: `${res.message} (${res.nama} - ${res.kelas})`,
        })
      } else {
        setPopup({
          show: true,
          success: false,
          nama: res.nama,
          message: res.message,
        })
        addLog({
          status: res.message.includes('Sudah Absen') ? 'warning' : 'error',
          nama: res.nama,
          message: `${res.message} ${res.nama ? `(${res.nama})` : ''}`,
        })
      }
    } catch (err: unknown) {
      playNotificationSound(false)
      const msg = err instanceof Error ? err.message : 'Kesalahan jaringan/server'
      setPopup({ show: true, success: false, message: msg })
      addLog({ status: 'error', message: msg })
    }
  }

  const addLog = (entry: Omit<ScanLogEntry, 'id' | 'time'>) => {
    const newEntry: ScanLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString('id-ID'),
      ...entry,
    }
    setLogs((prev) => [newEntry, ...prev.slice(0, 19)])
  }

  // Start Scanner
  const startScanner = async () => {
    if (!selectedCameraId) return

    try {
      const html5QrCode = new Html5Qrcode('qr-reader')
      html5QrCodeRef.current = html5QrCode

      const config: Html5QrcodeCameraScanConfig = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      }

      await html5QrCode.start(
        selectedCameraId,
        config,
        (decodedText) => {
          if (lockRef.current) return
          if (decodedText === lastCodeRef.current) return

          lockRef.current = true
          lastCodeRef.current = decodedText

          handleProcessScan(decodedText, 'camera')

          // Unlock after 3 seconds for next scan
          setTimeout(() => {
            lockRef.current = false
            lastCodeRef.current = ''
          }, 3000)
        },
        () => {
          // ignore scan error per frame
        }
      )

      setIsScanning(true)
    } catch (err) {
      console.error('Gagal memulai kamera:', err)
      alert('Gagal mengakses kamera. Pastikan izin kamera telah diberikan di browser.')
    }
  }

  // Stop Scanner
  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current = null
      } catch (err) {
        console.warn('Gagal menghentikan kamera:', err)
      }
    }
    setIsScanning(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {})
      }
    }
  }, [])

  // Manual code submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return

    setIsSubmittingManual(true)
    await handleProcessScan(manualCode, 'manual')
    setManualCode('')
    setIsSubmittingManual(false)
  }

  return (
    <div className="scan-page flex flex-col text-slate-100">
      <div className="flex-1 flex flex-col">
        
        {/* Top Header */}
        <header className="bg-slate-950/40 border-b border-white/5 p-4 sticky top-0 z-30 backdrop-blur-md shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-900/80 border border-white/10 p-1 flex items-center justify-center shadow-inner">
                  <img src="/img/nkk.png" alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
                </div>
                <div>
                  <h1 className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">NKKSmart Scan</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-3 py-1.5 rounded-full border shadow-sm backdrop-blur-md ${isAdmin ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-slate-800/50 border-white/10 text-slate-300'}`}>
                {isAdmin ? 'Admin Mode' : 'Mode Publik'}
              </span>
            </div>
          </div>
        </header>

        {/* Main Container */}
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5 lg:mr-8 lg:ml-auto lg:max-w-[min(54vw,760px)]">
          
          {/* Status Meeting Banner */}
          <div
            className={`p-4 rounded-2xl border backdrop-blur-md flex items-center justify-between text-sm shadow-lg transition-all duration-300 ${
              meetingStatus?.active
                ? 'bg-gradient-to-r from-emerald-950/60 to-emerald-900/40 border-emerald-500/40 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                : meetingStatus?.status === 'libur'
                ? 'bg-gradient-to-r from-amber-950/60 to-amber-900/40 border-amber-500/40 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                : 'bg-slate-900/50 border-white/10 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full flex items-center justify-center ${meetingStatus?.active ? 'bg-emerald-500/20' : meetingStatus?.status === 'libur' ? 'bg-amber-500/20' : 'bg-white/5'}`}>
                {meetingStatus?.active ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : meetingStatus?.status === 'libur' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-500 shrink-0" />
                )}
              </div>
              <div>
                <p className="font-semibold text-white text-base">
                  {meetingStatus?.meeting?.nama_pertemuan || 'Tidak Ada Pertemuan Aktif'}
                </p>
                <p className="text-xs opacity-80 mt-0.5">{meetingStatus?.message}</p>
              </div>
            </div>
            <button
              onClick={fetchMeetingStatus}
              title="Refresh Status"
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Geofence Status Banner */}
          {geofence?.configured && (
            <div
              className={`p-3.5 rounded-2xl border backdrop-blur-md flex items-center gap-3 text-sm shadow-lg transition-colors ${
                isInsideFence
                  ? 'bg-teal-950/40 border-teal-500/30 text-teal-100'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
              }`}
            >
              <div className={`p-2 rounded-full ${isInsideFence ? 'bg-teal-500/20' : 'bg-rose-500/20'}`}>
                <MapPin className={`w-4 h-4 shrink-0 ${isInsideFence ? 'text-teal-400' : 'text-rose-400'}`} />
              </div>
              <div className="flex-1">
                <span className="font-medium text-white">
                  {isInsideFence ? 'Lokasi Valid' : 'Di Luar Radius Sekolah'}:
                </span>{' '}
                <span className="opacity-90">{distance !== null ? `Jarak ${distance}m (Maksimal ${geofence.radius}m)` : 'Memeriksa GPS...'}</span>
                {geoError && <span className="block text-rose-400 mt-1 text-xs font-medium bg-rose-950/50 p-1.5 rounded-md">{geoError}</span>}
              </div>
            </div>
          )}

          {/* Controls Toolbar */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
            {/* Target Filter */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Target</span>
              <select
                value={scanType}
                onChange={(e) => setScanType(e.target.value as 'auto' | 'anggota' | 'pengurus')}
                className="bg-slate-950/50 border border-white/10 rounded-full px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none cursor-pointer"
              >
                <option value="auto">Semua (Auto)</option>
                <option value="anggota">Khusus Anggota</option>
                <option value="pengurus">Khusus Pengurus</option>
              </select>
            </div>

            {/* Camera Selection */}
            {cameras.length > 0 && (
              <div className="flex items-center gap-3">
                <select
                  value={selectedCameraId}
                  disabled={isScanning}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="bg-slate-950/50 border border-white/10 rounded-full px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none cursor-pointer max-w-[200px] truncate disabled:opacity-50"
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label || `Kamera ${c.id.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={() => setIsMirrored(!isMirrored)}
                title="Mirror Video"
                className={`p-2.5 rounded-full border transition-all duration-300 shadow-md ${
                  isMirrored
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-800/50 border-white/10 text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
              {isScanning ? (
                <button
                  onClick={stopScanner}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-full text-sm font-semibold shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-all hover:scale-105 active:scale-95"
                >
                  <CameraOff className="w-4 h-4" />
                  <span>Stop Scanner</span>
                </button>
              ) : (
                <button
                  onClick={startScanner}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-full text-sm font-semibold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Mulai Scan</span>
                </button>
              )}
            </div>
          </div>

          {/* Video Scanner Viewport */}
          <div className="relative bg-slate-950/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl aspect-square sm:aspect-video flex items-center justify-center backdrop-blur-sm">
            {/* Reader HTML5 Target Element */}
            <div
              id="qr-reader"
              className={`w-full h-full flex items-center justify-center ${isMirrored ? 'scale-x-[-1]' : ''}`}
            />

            {/* Idle Placeholder */}
            {!isScanning && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 p-6 text-center bg-slate-950/60 backdrop-blur-sm">
                <img src="/img/nkk.png" alt="Watermark" className="absolute inset-0 m-auto w-48 h-48 opacity-5 object-contain pointer-events-none" />
                <div className="w-20 h-20 rounded-full bg-slate-900/80 border border-white/10 flex items-center justify-center text-slate-400 shadow-xl z-10">
                  <Camera className="w-10 h-10" />
                </div>
                <div className="z-10">
                  <p className="font-bold text-lg text-white tracking-wide">Kamera Nonaktif</p>
                  <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">
                    Arahkan kartu NKKSmart Anda ke kamera setelah menekan tombol di bawah.
                  </p>
                </div>
                <button
                  onClick={startScanner}
                  className="mt-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-full text-sm font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95 z-10"
                >
                  Aktifkan Kamera Sekarang
                </button>
              </div>
            )}

            {/* Target Scan Box Animation */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                <div className="w-64 h-64 border-[1px] border-emerald-500/20 rounded-3xl relative shadow-[0_0_0_9999px_rgba(2,6,23,0.7)] backdrop-blur-[2px]">
                  {/* Glowing Corners */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-3xl shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-3xl shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-3xl shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-3xl shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  {/* Scanning Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan absolute top-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                </div>
              </div>
            )}
          </div>

          {/* Manual Code Input (Hanya jika admin login) */}
          {isAdmin && (
            <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center gap-2 mb-3 text-sm text-slate-200 font-semibold">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Input Manual (Admin Only)</span>
              </div>
              <form onSubmit={handleManualSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Masukkan Kode Unik (mis. NKKP-0001)"
                  className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={isSubmittingManual || !manualCode.trim()}
                  className="px-6 py-3 bg-slate-800 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors border border-white/10"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim</span>
                </button>
              </form>
            </div>
          )}

          {/* Scan History Log */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-xl flex-1 flex flex-col min-h-[250px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <History className="w-5 h-5 text-emerald-400" />
                <span>Log Absensi Terkini</span>
              </div>
              <span className="text-xs bg-white/5 px-2.5 py-1 rounded-full text-slate-400 border border-white/5">{logs.length} entri</span>
            </div>

            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500 opacity-60">
                  <History className="w-12 h-12 mb-2" />
                  <p className="text-sm">Belum ada scan yang dilakukan.</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-white/5 shadow-sm border-l-4 ${
                      log.status === 'success'
                        ? 'border-l-emerald-500'
                        : log.status === 'warning'
                        ? 'border-l-amber-500'
                        : 'border-l-rose-500'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 truncate pr-4">
                      <span className="text-slate-200 text-sm font-medium truncate">{log.message}</span>
                      {log.nama && <span className="text-slate-400 text-xs truncate">{log.nama} {log.kelas ? `- ${log.kelas}` : ''}</span>}
                    </div>
                    <span className="text-slate-500 text-xs font-mono shrink-0 bg-slate-900/80 px-2 py-1 rounded-md">{log.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Scan Result Popup Modal */}
      {popup.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div
            className={`w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl border ${
              popup.success
                ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.15)]'
                : 'bg-gradient-to-b from-slate-900 to-slate-950 border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.15)]'
            }`}
          >
            <div
              className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 shadow-inner ${
                popup.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {popup.success ? <CheckCircle2 className="w-12 h-12 animate-in zoom-in duration-300" /> : <XCircle className="w-12 h-12 animate-in zoom-in duration-300" />}
            </div>

            <h3 className="text-xl font-bold text-white mb-2">{popup.message}</h3>

            {popup.nama && (
              <div className="mt-4 p-4 bg-slate-950/60 rounded-2xl border border-white/5 text-sm shadow-inner">
                <p className="font-bold text-emerald-400 text-lg">{popup.nama}</p>
                {popup.kelas && <p className="text-slate-300 mt-1">{popup.kelas}</p>}
                {popup.jabatan && (
                  <span className="inline-block mt-2 px-3 py-1 text-xs rounded-full bg-slate-800 border border-slate-700 text-slate-200 font-medium tracking-wide">
                    {popup.jabatan}
                  </span>
                )}
                {popup.time && <p className="text-slate-500 text-xs mt-3 font-mono">{popup.time}</p>}
              </div>
            )}

            <button
              onClick={() => setPopup({ ...popup, show: false })}
              className={`mt-6 w-full py-3.5 rounded-2xl text-sm font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-95 text-white ${
                popup.success 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400' 
                  : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400'
              }`}
            >
              Tutup & Lanjutkan
            </button>
          </div>
        </div>
      )}
      
      {/* Custom Scan Line Animation Style */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scan {
          animation: scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}
