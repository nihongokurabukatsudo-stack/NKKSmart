import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode'
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
  Flashlight,
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
  meetingName?: string
}

export const ScanPage: React.FC = () => {
  const { isAdmin } = useAuth()

  // State Scanner
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [isMirrored, setIsMirrored] = useState<boolean>(false)
  const [scanType, setScanType] = useState<'auto' | 'anggota' | 'pengurus'>('auto')
  const [cameraError, setCameraError] = useState('')
  const [isStatusLoading, setIsStatusLoading] = useState(true)
  const [manualSheetOpen, setManualSheetOpen] = useState(false)
  const [historySheetOpen, setHistorySheetOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

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
  const lastScannedAtRef = useRef<Map<string, number>>(new Map())
  const lockRef = useRef<boolean>(false)
  const requestInFlightRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Init notification audio
  useEffect(() => {
    const audio = new Audio('/assets/audio/notif.mp3')
    audio.preload = 'auto'
    audioRef.current = audio
  }, [])

  useEffect(() => {
    const online = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [])

  useEffect(() => {
    if (!popup.show) return
    const timer = window.setTimeout(() => setPopup((current) => ({ ...current, show: false })), 3000)
    return () => window.clearTimeout(timer)
  }, [popup.show, popup.message])

  useEffect(() => {
    if (!popup.show) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPopup((current) => ({ ...current, show: false }))
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [popup.show])

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
    } finally {
      setIsStatusLoading(false)
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
        setGeoError('Browser tidak mendukung GPS.')
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
        setGeoError('Izinkan akses lokasi di pengaturan browser.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [geofence])

  // Submit Scan ke RPC Supabase
  const handleProcessScan = async (rawCode: string, mode: 'camera' | 'manual' = 'camera') => {
    const code = rawCode.trim()
    if (!code || requestInFlightRef.current) return

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

    requestInFlightRef.current = true
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
      const scanTime = res.waktu_scan ? new Date(res.waktu_scan) : new Date()
      const formattedScanTime = Number.isNaN(scanTime.getTime())
        ? res.waktu_scan
        : `${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(scanTime)} WIB`

      playNotificationSound(res.ok)
      if (typeof navigator.vibrate === 'function') navigator.vibrate(res.ok ? [60, 30, 60] : 100)

      if (res.ok) {
        setPopup({
          show: true,
          success: true,
          nama: res.nama,
          kelas: res.kelas,
          jabatan: res.jabatan,
          message: res.message || 'Absensi berhasil',
          time: formattedScanTime,
          meetingName: meetingStatus?.meeting?.nama_pertemuan,
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
    } finally {
      requestInFlightRef.current = false
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
  const startScanner = async (cameraId = selectedCameraId) => {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Browser ini tidak mendukung kamera. Coba gunakan browser versi terbaru.')
      return
    }
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      setCameraError('Kamera hanya berfungsi melalui HTTPS. Buka tautan situs yang aman.')
      return
    }

    try {
      // Request permission from the user's click before enumerating devices;
      // browsers hide camera labels until permission is granted.
      const permissionStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: cameraId ? { deviceId: { exact: cameraId } } : { facingMode: { ideal: 'environment' } },
      })
      permissionStream.getTracks().forEach((track) => track.stop())

      const videoDevices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'videoinput')
      const discoveredCameras = videoDevices.map((device, index) => ({ id: device.deviceId, label: device.label || `Kamera ${index + 1}` }))
      setCameras(discoveredCameras)
      if (discoveredCameras.length === 0) throw new DOMException('No camera found', 'NotFoundError')

      const { Html5Qrcode } = await import('html5-qrcode')
      const html5QrCode = new Html5Qrcode('qr-reader')
      html5QrCodeRef.current = html5QrCode

      const config: Html5QrcodeCameraScanConfig = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      }

      await html5QrCode.start(
        cameraId || { facingMode: 'environment' },
        config,
        (decodedText) => {
          const now = Date.now()
          if (lockRef.current) return
          const lastAt = lastScannedAtRef.current.get(decodedText) || 0
          if (decodedText === lastCodeRef.current && now - lastAt < 5000) return

          lockRef.current = true
          lastCodeRef.current = decodedText
          lastScannedAtRef.current.set(decodedText, now)
          void handleProcessScan(decodedText, 'camera').finally(() => {
            window.setTimeout(() => { lockRef.current = false }, 1500)
          })
        },
        () => {
          // ignore scan error per frame
        }
      )

      setIsScanning(true)
      const video = document.querySelector('#qr-reader video') as HTMLVideoElement | null
      const track = (video?.srcObject as MediaStream | null)?.getVideoTracks()[0]
      const capabilities = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined
      setTorchSupported(Boolean(capabilities?.torch))
      const activeDeviceId = track?.getSettings().deviceId
      const backCamera = discoveredCameras.find((device) => /back|rear|environment|belakang/i.test(device.label))
      const defaultCameraId = cameraId || activeDeviceId || backCamera?.id || ''
      if (defaultCameraId) setSelectedCameraId(defaultCameraId)
    } catch (err) {
      console.error('Gagal memulai kamera:', err)
      const name = (err as DOMException)?.name
      const detail = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
      const message = name === 'NotAllowedError' || name === 'PermissionDeniedError' || detail.includes('notallowederror') || detail.includes('permission denied')
        ? 'Izin kamera ditolak. Buka pengaturan situs di browser dan izinkan kamera.'
        : name === 'NotFoundError' || detail.includes('notfounderror') || detail.includes('no camera')
          ? 'Kamera tidak ditemukan pada perangkat ini.'
          : name === 'NotReadableError' || detail.includes('notreadableerror')
            ? 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.'
            : name === 'SecurityError' || detail.includes('secure context')
              ? 'Kamera memerlukan koneksi HTTPS yang aman.'
              : 'Kamera gagal dimulai. Periksa izin kamera di browser lalu coba kembali.'
      setCameraError(message)
    }
  }

  // Stop Scanner
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current = null
      } catch (err) {
        console.warn('Gagal menghentikan kamera:', err)
      }
    }
    setIsScanning(false)
    setTorchOn(false)
    setTorchSupported(false)
  }

  const handleCameraChange = async (cameraId: string) => {
    setSelectedCameraId(cameraId)
    if (!isScanning) return
    await stopScanner()
    await startScanner(cameraId)
  }

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !torchSupported) return
    const next = !torchOn
    try {
      await html5QrCodeRef.current.applyVideoConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] } as MediaTrackConstraints)
      setTorchOn(next)
    } catch (error) {
      setCameraError('Senter tidak dapat diubah pada kamera ini.')
    }
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

  const popupWarning = popup.message.toLowerCase().includes('sudah absen')
  const hasLocationFix = Boolean(userLocation)
  const locationBadge = geoError ? 'GPS Error' : hasLocationFix ? (isInsideFence ? 'GPS OK' : 'Di luar radius') : 'GPS…'

  return (
    <div className={`scan-page flex flex-col text-slate-100 ${isScanning ? 'is-scanning' : 'is-idle'}`}>
      <div className="flex-1 flex flex-col">

        {/* Top Header */}
        <header className="scan-topbar border-b border-white/10 bg-slate-950/45 px-3 py-2.5 backdrop-blur-xl shadow-lg">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
              <Link to="/" aria-label="Kembali" className="hidden p-2 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors sm:inline-flex">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex min-w-0 items-center gap-2">
                <div className="h-9 w-9 shrink-0 rounded-full bg-slate-900/80 border border-white/10 p-1 flex items-center justify-center shadow-inner">
                  <img src="/assets/admin/nkk.png" alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
                </div>
                <div>
                  <h1 className="font-bold text-sm sm:text-lg bg-gradient-to-r from-pink-300 to-pink-300 bg-clip-text text-transparent">NKKSmart Scan</h1>
                  <p className="hidden text-[10px] text-slate-300 sm:block">Absensi ekstrakurikuler</p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs ${meetingStatus?.active ? 'border-pink-400/40 bg-pink-500/20 text-pink-200' : meetingStatus?.status === 'libur' ? 'border-slate-300/30 bg-slate-500/20 text-slate-100' : 'border-rose-300/40 bg-rose-500/20 text-rose-100'}`}>
                {isStatusLoading ? 'Memuat…' : meetingStatus?.active ? 'Aktif' : meetingStatus?.status === 'libur' ? 'Libur' : 'Di luar jadwal'}
              </span>
              {geofence?.configured && <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs ${hasLocationFix && isInsideFence ? 'border-pink-400/40 bg-pink-500/20 text-pink-100' : hasLocationFix || geoError ? 'border-rose-300/50 bg-rose-500/25 text-rose-100' : 'border-white/20 bg-slate-500/30 text-slate-100'}`}>{locationBadge}</span>}
            </div>
          </div>
        </header>

        {/* Main Container */}
        <main className="scan-main mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto px-3 py-3 sm:gap-5 sm:p-6 lg:mr-8 lg:ml-auto lg:max-w-[min(54vw,760px)]">

          {/* Status Meeting Banner */}
          <div
            className={`scan-meeting-status order-1 rounded-xl border px-3 py-2.5 backdrop-blur-md flex items-center justify-between text-sm shadow-lg transition-all duration-300 sm:p-4 sm:rounded-2xl ${
              meetingStatus?.active
                ? 'bg-gradient-to-r from-pink-950/60 to-pink-900/40 border-pink-500/40 text-pink-100 shadow-[0_0_20px_rgba(244,63,94,0.1)]'
                : meetingStatus?.status === 'libur'
                ? 'bg-gradient-to-r from-rose-950/60 to-rose-900/40 border-rose-500/40 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.1)]'
                : 'bg-slate-900/50 border-white/10 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full flex items-center justify-center ${meetingStatus?.active ? 'bg-pink-500/20' : meetingStatus?.status === 'libur' ? 'bg-rose-500/20' : 'bg-white/5'}`}>
                {meetingStatus?.active ? (
                  <CheckCircle2 className="w-5 h-5 text-pink-400 shrink-0" />
                ) : meetingStatus?.status === 'libur' ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-500 shrink-0" />
                )}
              </div>
              <div>
                {isStatusLoading ? <div className="h-4 w-40 animate-pulse rounded bg-white/15" aria-label="Memuat status pertemuan" /> : <p className="font-semibold text-white text-sm sm:text-base">{meetingStatus?.meeting?.nama_pertemuan || 'Tidak Ada Pertemuan Aktif'}</p>}
                {!isStatusLoading && <p className="mt-0.5 text-xs opacity-90">{meetingStatus?.message || 'Status pertemuan belum tersedia.'}</p>}
              </div>
            </div>
            <button
              onClick={fetchMeetingStatus}
              title="Refresh Status"
              className="min-h-12 min-w-12 p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Geofence Status Banner */}
          {geofence?.configured && (
            <div
              className={`scan-geofence-status order-2 rounded-xl border px-3 py-2 backdrop-blur-md flex items-center gap-2 text-xs shadow-lg transition-colors sm:p-3.5 sm:gap-3 sm:text-sm sm:rounded-2xl ${
                hasLocationFix && isInsideFence
                  ? 'bg-rose-950/40 border-rose-500/30 text-rose-100'
                  : hasLocationFix || geoError ? 'bg-rose-950/40 border-rose-500/30 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.15)]' : 'bg-slate-900/50 border-white/10 text-slate-200'
              }`}
            >
              <div className={`p-2 rounded-full ${hasLocationFix && isInsideFence ? 'bg-rose-500/20' : hasLocationFix || geoError ? 'bg-rose-500/20' : 'bg-white/5'}`}>
                <MapPin className={`w-4 h-4 shrink-0 ${hasLocationFix && isInsideFence ? 'text-rose-400' : hasLocationFix || geoError ? 'text-rose-300' : 'text-slate-300'}`} />
              </div>
              <div className="flex-1">
                <span className="font-medium text-white">
                  {hasLocationFix ? (isInsideFence ? 'Lokasi Valid' : 'Di Luar Radius Sekolah') : 'Memeriksa GPS'}:
                </span>{' '}
                <span className="opacity-90">{distance !== null ? `Jarak ${distance}m (Maksimal ${geofence.radius}m)` : 'Menunggu izin lokasi perangkat.'}</span>
                {geoError && <span className="block text-rose-400 mt-1 text-xs font-medium bg-rose-950/50 p-1.5 rounded-md">{geoError}</span>}
              </div>
            </div>
          )}

          {/* Controls Toolbar */}
          <div className="scan-controls order-4 bg-slate-900/65 backdrop-blur-xl border border-white/15 p-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-2 sm:p-4 sm:gap-4">
            {/* Target Filter */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Target</span>
              <select
                value={scanType}
                onChange={(e) => setScanType(e.target.value as 'auto' | 'anggota' | 'pengurus')}
                aria-label="Target scan"
                className="bg-slate-950/50 border border-white/10 rounded-full px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all appearance-none cursor-pointer"
              >
                <option value="auto">Semua (Auto)</option>
                <option value="anggota">Khusus Anggota</option>
                <option value="pengurus">Khusus Pengurus</option>
              </select>
            </div>

            {/* Camera Selection */}
            {cameras.length > 0 && (
              <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
                <select
                  value={selectedCameraId}
                  onChange={(e) => { void handleCameraChange(e.target.value) }}
                  aria-label="Ganti kamera"
                  className="min-h-12 min-w-0 flex-1 bg-slate-950/70 border border-white/15 rounded-full px-3 py-2 text-base text-slate-100 focus:outline-none focus:border-pink-500 transition-all appearance-none cursor-pointer sm:max-w-[200px] sm:flex-none disabled:opacity-50"
                >
                  {!selectedCameraId && <option value="">Otomatis</option>}
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label || `Kamera ${c.id.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex w-full items-center justify-center gap-2 sm:ml-auto sm:w-auto sm:justify-end sm:gap-3">
              <button
                onClick={() => setIsMirrored(!isMirrored)}
                title="Mirror Video"
                aria-label={isMirrored ? 'Matikan mirror kamera' : 'Aktifkan mirror kamera'}
                className={`inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border transition-all duration-300 shadow-md ${
                  isMirrored
                    ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                    : 'bg-slate-800/50 border-white/10 text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
              {torchSupported && <button type="button" onClick={toggleTorch} aria-label={torchOn ? 'Matikan senter' : 'Nyalakan senter'} className={`inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border ${torchOn ? 'border-rose-300 bg-rose-400/20 text-rose-200' : 'border-white/15 bg-slate-800/80 text-slate-200'}`}><Flashlight className="h-5 w-5"/></button>}
              {isScanning ? (
                <button
                  onClick={stopScanner}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-full text-sm font-semibold shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-all hover:scale-105 active:scale-95"
                >
                  <CameraOff className="w-4 h-4" />
                    <span>Hentikan Scan</span>
                </button>
              ) : (
                <button
                  onClick={() => { void startScanner() }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white rounded-full text-sm font-semibold shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all hover:scale-105 active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                    <span>{cameraError ? 'Coba lagi' : 'Mulai Scan'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Video Scanner Viewport */}
          <div className="scan-camera-window order-3 relative mx-auto w-full overflow-hidden rounded-3xl border border-white/20 bg-slate-950/85 shadow-2xl flex items-center justify-center backdrop-blur-sm">
            {/* Reader HTML5 Target Element */}
            <div
              id="qr-reader"
              className={`w-full h-full flex items-center justify-center ${isMirrored ? 'scale-x-[-1]' : ''}`}
            />

            {/* Idle Placeholder */}
            {!isScanning && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-4 text-center bg-slate-950/25 backdrop-blur-[2px] sm:gap-5 sm:p-6">
                <img src="/assets/admin/nkk.png" alt="Watermark" className="absolute inset-0 m-auto w-48 h-48 opacity-5 object-contain pointer-events-none" />
                <div className="z-10 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-slate-900/70 text-slate-100 shadow-xl sm:h-20 sm:w-20 sm:text-slate-400">
                  <Camera className="h-7 w-7 sm:h-10 sm:w-10" />
                </div>
                <div className="z-10">
                  <p className="font-bold text-lg text-white tracking-wide">{cameraError ? 'Kamera belum siap' : 'Kamera Nonaktif'}</p>
                  <p className="mx-auto mt-2 max-w-xs text-sm text-slate-200">
                    {cameraError || 'Arahkan kartu NKKSmart Anda ke kamera setelah menekan tombol di bawah.'}
                  </p>
                </div>
              </div>
            )}

            {/* Target Scan Box Animation */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                <div className="scan-target-frame relative aspect-[3/4] w-[72%] max-h-[90%] rounded-3xl border border-pink-500/30 shadow-[0_0_0_9999px_rgba(2,6,23,0.28)] backdrop-blur-[1px]">
                  {/* Glowing Corners */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-pink-400 rounded-tl-3xl shadow-[0_0_10px_rgba(244,114,182,0.5)]" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-pink-400 rounded-tr-3xl shadow-[0_0_10px_rgba(244,114,182,0.5)]" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-pink-400 rounded-bl-3xl shadow-[0_0_10px_rgba(244,114,182,0.5)]" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-pink-400 rounded-br-3xl shadow-[0_0_10px_rgba(244,114,182,0.5)]" />
                  {/* Scanning Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-pink-400 to-transparent animate-scan absolute top-0 shadow-[0_0_8px_rgba(244,114,182,0.8)]" />
                </div>
              </div>
            )}
          </div>

          {/* Manual Code Input (Hanya jika admin login) */}
          {isAdmin && <button type="button" onClick={() => setManualSheetOpen(true)} className="scan-sheet-trigger order-5 min-h-12 rounded-2xl border border-white/15 bg-slate-900/60 px-4 text-sm font-semibold text-slate-100"><ShieldCheck className="mr-2 inline h-4 w-4 text-pink-300"/>Input manual</button>}

          {/* Scan History Log */}
          <button type="button" onClick={() => setHistorySheetOpen(true)} className="scan-sheet-trigger order-6 flex min-h-12 items-center justify-between rounded-2xl border border-white/15 bg-slate-900/60 px-4 text-sm font-semibold text-slate-100"><span><History className="mr-2 inline h-4 w-4 text-pink-300"/>Riwayat scan</span><span className="text-xs text-slate-300">{logs.length} entri</span></button>
        </main>
        {!isOnline && <div className="fixed left-3 right-3 top-16 z-40 rounded-xl border border-rose-300/40 bg-rose-950/90 p-3 text-center text-sm text-rose-100 shadow-xl">Tidak ada koneksi internet. Scan memerlukan koneksi untuk tersimpan.</div>}
        {manualSheetOpen && isAdmin && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm" onClick={() => !isSubmittingManual && setManualSheetOpen(false)}><section role="dialog" aria-modal="true" aria-label="Input manual" className="scan-glass w-full max-w-lg rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Input manual · Admin</h2><button type="button" onClick={() => setManualSheetOpen(false)} disabled={isSubmittingManual} className="min-h-12 min-w-12 rounded-full border border-white/20 disabled:opacity-50">×</button></div><form onSubmit={async (event) => { await handleManualSubmit(event); setManualSheetOpen(false) }} className="flex gap-2"><input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Masukkan kode unik" className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/20 bg-slate-950/75 px-4 text-base text-white placeholder-slate-400"/><button type="submit" disabled={isSubmittingManual || !manualCode.trim()} className="min-h-12 rounded-xl bg-pink-600 px-4 font-semibold text-white disabled:opacity-50"><Send className="mr-1 inline h-4 w-4"/>Kirim</button></form></section></div>}
        {historySheetOpen && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm" onClick={() => setHistorySheetOpen(false)}><section role="dialog" aria-modal="true" aria-label="Riwayat scan" className="scan-glass max-h-[70dvh] w-full max-w-lg overflow-y-auto rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h2 className="font-bold"><History className="mr-2 inline h-5 w-5 text-pink-300"/>Riwayat scan</h2><button type="button" onClick={() => setHistorySheetOpen(false)} className="min-h-12 min-w-12 rounded-full border border-white/20">Tutup</button></div>{logs.length === 0 ? <p className="py-8 text-center text-sm text-slate-300">Belum ada scan yang dilakukan.</p> : <div className="space-y-2">{logs.map((log) => <div key={log.id} className={`flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-3 ${log.status === 'success' ? 'border-l-4 border-l-pink-500' : log.status === 'warning' ? 'border-l-4 border-l-rose-400' : 'border-l-4 border-l-rose-500'}`}><span className="min-w-0 text-sm text-white">{log.message}</span><time className="shrink-0 text-xs text-slate-300">{log.time}</time></div>)}</div>}</section></div>}
      </div>

      {/* Non-blocking scan result notification */}
      {popup.show && (
        <div className="pointer-events-none fixed inset-x-3 top-[max(1rem,env(safe-area-inset-top))] z-[100] flex justify-center sm:inset-x-auto sm:right-5 sm:w-[min(26rem,calc(100vw-2.5rem))]">
          <section
            role={popup.success ? 'status' : 'alert'}
            aria-live={popup.success ? 'polite' : 'assertive'}
            aria-atomic="true"
            className={`popup-card-enter pointer-events-auto relative w-full rounded-2xl border p-4 pr-12 text-left shadow-2xl ${popup.success ? 'border-pink-500/40 bg-slate-900 text-white' : popupWarning ? 'border-amber-400/40 bg-slate-900 text-white' : 'border-rose-500/40 bg-slate-900 text-white'}`}
          >
            <button aria-label="Tutup pemberitahuan" onClick={() => setPopup((current) => ({ ...current, show: false }))} className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/10">×</button>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 shrink-0 ${popup.success ? 'text-pink-300' : popupWarning ? 'text-amber-300' : 'text-rose-300'}`}>{popup.success ? <CheckCircle2 className="h-5 w-5"/> : <AlertTriangle className="h-5 w-5"/>}</span>
              <div className="min-w-0">
                <p className="font-bold">{popup.success ? 'Absensi berhasil' : popup.message}</p>
                {popup.success && <p className="mt-1 break-words text-sm text-slate-200">{[popup.nama, popup.kelas, popup.jabatan, popup.time, popup.meetingName].filter(Boolean).join(' · ') || popup.message}</p>}
                {!popup.success && popup.nama && <p className="mt-1 text-sm text-slate-300">{[popup.nama, popup.kelas].filter(Boolean).join(' · ')}</p>}
              </div>
            </div>
          </section>
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
