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

  // Preload the success artwork so it appears immediately after a valid scan.
  useEffect(() => {
    const artwork = new Image()
    artwork.src = '/assets/admin/popup.png'
  }, [])

  useEffect(() => {
    if (!popup.show) return
    const timer = window.setTimeout(() => setPopup((current) => ({ ...current, show: false })), popup.success ? 5000 : 4000)
    return () => window.clearTimeout(timer)
  }, [popup.show, popup.message, popup.success])

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
          <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
              <Link to="/admin" aria-label="Kembali ke dashboard" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:border-pink-400/50 hover:bg-white/5 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex min-w-0 items-center gap-2">
                <div className="h-10 w-10 shrink-0 rounded-xl border border-white/10 bg-zinc-900 p-1 flex items-center justify-center">
                  <img src="/assets/admin/nkk.png" alt="Logo NKK" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="font-bold text-sm text-white sm:text-lg">NKKSmart Scan</h1>
                  <p className="text-[10px] text-slate-400 sm:text-xs">Absensi Ekstrakurikuler</p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className={`rounded-full border px-2.5 py-1.5 text-[10px] font-bold sm:px-3 sm:text-xs ${meetingStatus?.status === 'libur' ? 'border-red-400/50 bg-red-500/20 text-red-200' : meetingStatus?.active ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200' : 'border-slate-600 bg-slate-800 text-slate-200'}`}>
                {isStatusLoading ? 'Memuat…' : meetingStatus?.active ? 'Aktif' : meetingStatus?.status === 'libur' ? 'Libur' : 'Di luar jadwal'}
              </span>
              <span className={`rounded-full border px-2.5 py-1.5 text-[10px] font-bold sm:px-3 sm:text-xs ${hasLocationFix && isInsideFence ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200' : geoError || hasLocationFix ? 'border-red-400/40 bg-red-500/15 text-red-200' : 'border-slate-600 bg-slate-800 text-slate-200'}`}>{geofence?.configured ? locationBadge : 'GPS belum disetel'}</span>
            </div>
          </div>
        </header>

        {/* Main Container */}
        <main className="scan-main mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 grid-cols-1 gap-3 overflow-x-hidden px-3 py-3 sm:gap-5 sm:px-6 sm:py-6">

          {/* Status Meeting Banner */}
          <div
            className={`scan-meeting-status order-1 rounded-2xl border px-3 py-3 flex items-center justify-between text-sm transition-colors sm:p-5 ${
              meetingStatus?.active
                ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-100'
                : meetingStatus?.status === 'libur'
                ? 'bg-red-950/60 border-red-500/60 text-red-100'
                : 'bg-zinc-900 border-zinc-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl flex items-center justify-center ${meetingStatus?.active ? 'bg-emerald-500/15' : meetingStatus?.status === 'libur' ? 'bg-red-500/15' : 'bg-zinc-800'}`}>
                {meetingStatus?.active ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                ) : meetingStatus?.status === 'libur' ? (
                  <AlertTriangle className="w-5 h-5 text-red-300 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-400 shrink-0" />
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
              className="min-h-11 min-w-11 p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-300 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Geofence Status Banner */}
            <div
              className={`scan-geofence-status order-2 rounded-2xl border px-3 py-3 flex items-center gap-3 text-xs transition-colors sm:p-5 sm:text-sm ${
                hasLocationFix && isInsideFence
                  ? 'bg-zinc-900 border-emerald-500/40 text-emerald-100'
                  : hasLocationFix || geoError ? 'bg-zinc-900 border-red-500/40 text-red-100' : 'bg-zinc-900 border-zinc-700 text-slate-200'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${hasLocationFix && isInsideFence ? 'bg-emerald-500/10' : hasLocationFix || geoError ? 'bg-red-500/10' : 'bg-zinc-800'}`}>
                <MapPin className={`w-5 h-5 shrink-0 ${hasLocationFix && isInsideFence ? 'text-emerald-300' : hasLocationFix || geoError ? 'text-red-300' : 'text-slate-300'}`} />
              </div>
              <div className="flex-1">
                <span className="font-medium text-white">
                  {hasLocationFix ? (isInsideFence ? 'Lokasi Valid' : 'Di luar radius') : 'Status Lokasi'}:
                </span>{' '}
                <span className="text-slate-300">{!geofence?.configured ? 'Lokasi presensi belum dikonfigurasi.' : distance !== null ? `Jarak ${distance} m (Maksimal ${geofence.radius} m)` : geoError || 'Menunggu izin lokasi perangkat.'}</span>
                {geoError && geofence?.configured && <span className="block text-red-200 mt-1 text-xs font-medium">{geoError}</span>}
              </div>
            </div>
          {/* Controls Toolbar */}
          <div className="scan-controls order-4 bg-zinc-900 border border-zinc-700 p-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-2 sm:p-4 sm:gap-4">
            {/* Target Filter */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Target</span>
              <select
                value={scanType}
                onChange={(e) => setScanType(e.target.value as 'auto' | 'anggota' | 'pengurus')}
                aria-label="Target scan"
                  className="bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all appearance-none cursor-pointer"
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
                  className="min-h-12 min-w-0 flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-base text-slate-100 focus:outline-none focus:border-pink-500 transition-all appearance-none cursor-pointer sm:max-w-[200px] sm:flex-none disabled:opacity-50"
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
                    : 'bg-zinc-950 border-zinc-700 text-slate-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
              {torchSupported && <button type="button" onClick={toggleTorch} aria-label={torchOn ? 'Matikan senter' : 'Nyalakan senter'} className={`inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border ${torchOn ? 'border-amber-300 bg-amber-400/10 text-amber-100' : 'border-zinc-700 bg-zinc-950 text-slate-200 hover:bg-zinc-800'}`}><Flashlight className="h-5 w-5"/></button>}
            </div>
          </div>

          {/* Video Scanner Viewport */}
          <div className="scan-camera-window order-3 relative w-full overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl flex items-center justify-center sm:rounded-3xl">
            {/* Reader HTML5 Target Element */}
            <div
              id="qr-reader"
              className={`w-full h-full flex items-center justify-center ${isMirrored ? 'scale-x-[-1]' : ''}`}
            />

            {/* Idle Placeholder */}
            {!isScanning && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950 p-4 text-center sm:p-6">
                <div className="z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-slate-300">
                  <Camera className="h-7 w-7 sm:h-10 sm:w-10" />
                </div>
                <div className="z-10">
                  <p className="font-bold text-base text-white tracking-wide sm:text-lg">{cameraError ? 'Kamera belum siap' : 'Kamera Nonaktif'}</p>
                  <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-400 sm:text-sm">
                    {cameraError || 'Aktifkan kamera, lalu arahkan ke QR kartu anggota.'}
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

          <div className="scan-camera-action">
            {isScanning ? (
              <button type="button" onClick={stopScanner} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 px-5 text-sm font-bold text-white transition hover:bg-zinc-700 active:scale-[.99]"><CameraOff size={18}/>Hentikan Scan</button>
            ) : (
              <button type="button" onClick={() => { void startScanner() }} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-5 text-sm font-bold text-white shadow-lg shadow-rose-950/30 transition hover:from-rose-500 hover:to-pink-500 active:scale-[.99]"><Camera size={18}/>{cameraError ? 'Coba Kamera Lagi' : 'Buka Kamera Scan'}</button>
            )}
          </div>

          {/* Manual Code Input (Hanya jika admin login) */}
          {isAdmin && <button type="button" onClick={() => setManualSheetOpen(true)} className="scan-sheet-trigger scan-manual-trigger order-5 min-h-12 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-slate-100 transition hover:border-pink-400/50 hover:bg-zinc-800"><ShieldCheck className="mr-2 inline h-4 w-4 text-pink-300"/>Input manual</button>}

          {/* Scan History Log */}
          <button type="button" onClick={() => setHistorySheetOpen(true)} className="scan-sheet-trigger scan-history-trigger order-6 flex min-h-12 items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-slate-100 transition hover:border-pink-400/50 hover:bg-zinc-800"><span><History className="mr-2 inline h-4 w-4 text-pink-300"/>Riwayat scan</span><span className="text-xs text-slate-300">{logs.length} entri</span></button>
        </main>
        {!isOnline && <div className="fixed left-3 right-3 top-16 z-40 rounded-xl border border-rose-300/40 bg-rose-950/90 p-3 text-center text-sm text-rose-100 shadow-xl">Tidak ada koneksi internet. Scan memerlukan koneksi untuk tersimpan.</div>}
        {manualSheetOpen && isAdmin && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm" onClick={() => !isSubmittingManual && setManualSheetOpen(false)}><section role="dialog" aria-modal="true" aria-label="Input manual" className="scan-glass w-full max-w-lg rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Input manual · Admin</h2><button type="button" onClick={() => setManualSheetOpen(false)} disabled={isSubmittingManual} className="min-h-12 min-w-12 rounded-full border border-white/20 disabled:opacity-50">×</button></div><form onSubmit={async (event) => { await handleManualSubmit(event); setManualSheetOpen(false) }} className="flex gap-2"><input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Masukkan kode unik" className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/20 bg-slate-950/75 px-4 text-base text-white placeholder-slate-400"/><button type="submit" disabled={isSubmittingManual || !manualCode.trim()} className="min-h-12 rounded-xl bg-pink-600 px-4 font-semibold text-white disabled:opacity-50"><Send className="mr-1 inline h-4 w-4"/>Kirim</button></form></section></div>}
        {historySheetOpen && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm" onClick={() => setHistorySheetOpen(false)}><section role="dialog" aria-modal="true" aria-label="Riwayat scan" className="scan-glass max-h-[70dvh] w-full max-w-lg overflow-y-auto rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h2 className="font-bold"><History className="mr-2 inline h-5 w-5 text-pink-300"/>Riwayat scan</h2><button type="button" onClick={() => setHistorySheetOpen(false)} className="min-h-12 min-w-12 rounded-full border border-white/20">Tutup</button></div>{logs.length === 0 ? <p className="py-8 text-center text-sm text-slate-300">Belum ada scan yang dilakukan.</p> : <div className="space-y-2">{logs.map((log) => <div key={log.id} className={`flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-3 ${log.status === 'success' ? 'border-l-4 border-l-pink-500' : log.status === 'warning' ? 'border-l-4 border-l-rose-400' : 'border-l-4 border-l-rose-500'}`}><span className="min-w-0 text-sm text-white">{log.message}</span><time className="shrink-0 text-xs text-slate-300">{log.time}</time></div>)}</div>}</section></div>}
      </div>

      {/* Success confirmation with the original artwork; failures stay as readable alerts. */}
      {popup.show && popup.success && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="scan-success-title"
            aria-live="polite"
            className="popup-card-enter relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-pink-400/40 bg-gradient-to-b from-zinc-900 via-slate-950 to-zinc-950 p-4 text-center text-white shadow-[0_24px_100px_rgba(236,72,153,.22)] sm:p-6"
          >
            <button type="button" aria-label="Tutup pemberitahuan" onClick={() => setPopup((current) => ({ ...current, show: false }))} className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/50 text-xl text-slate-200 transition hover:bg-white/10">×</button>
            <div className="overflow-hidden rounded-2xl border border-pink-300/15 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,.16),transparent_70%)] px-3 pt-3 sm:px-6">
              <img src="/assets/admin/popup.png" alt="Wokee! Absen masuk" className="mx-auto block max-h-[38dvh] w-full object-contain drop-shadow-[0_12px_30px_rgba(236,72,153,.22)]" />
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200"><CheckCircle2 className="h-4 w-4"/>TERSIMPAN</div>
            <h2 id="scan-success-title" className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">Absensi Berhasil</h2>
            <div className="mx-auto mt-4 max-w-sm rounded-2xl border border-white/10 bg-black/30 p-4 text-left">
              <p className="break-words text-lg font-bold leading-snug text-pink-200 sm:text-xl">{popup.nama || 'Absensi berhasil'}</p>
              {(popup.kelas || popup.jabatan) && <p className="mt-1 text-sm text-slate-300">{[popup.kelas, popup.jabatan].filter(Boolean).join(' · ')}</p>}
              {popup.time && <p className="mt-3 text-sm font-semibold text-white">{popup.time}</p>}
              {popup.meetingName && <p className="mt-2 border-t border-white/10 pt-2 text-sm text-slate-300">{popup.meetingName}</p>}
            </div>
            <button type="button" onClick={() => setPopup((current) => ({ ...current, show: false }))} className="mt-4 min-h-12 w-full rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-5 text-sm font-bold text-white shadow-lg shadow-pink-950/30 transition hover:brightness-110 active:scale-[.99]">Selesai</button>
            <div aria-hidden="true" className="popup-auto-progress absolute inset-x-0 bottom-0 h-1 origin-left rounded-b-3xl bg-pink-400" />
          </section>
        </div>
      )}
      {popup.show && !popup.success && (
        <div className="pointer-events-none fixed inset-x-3 top-[max(1rem,env(safe-area-inset-top))] z-[100] flex justify-center sm:inset-x-auto sm:right-5 sm:w-[min(26rem,calc(100vw-2.5rem))]">
          <section
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className={`popup-card-enter pointer-events-auto relative w-full rounded-2xl border p-4 pr-12 text-left shadow-2xl ${popupWarning ? 'border-amber-400/40 bg-slate-900 text-white' : 'border-rose-500/40 bg-slate-900 text-white'}`}
          >
            <button aria-label="Tutup pemberitahuan" onClick={() => setPopup((current) => ({ ...current, show: false }))} className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/10">×</button>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 shrink-0 ${popupWarning ? 'text-amber-300' : 'text-rose-300'}`}>{popupWarning ? <AlertTriangle className="h-5 w-5"/> : <XCircle className="h-5 w-5"/>}</span>
              <div className="min-w-0">
                <p className="font-bold">{popup.message}</p>
                {popup.nama && <p className="mt-1 text-sm text-slate-300">{[popup.nama, popup.kelas].filter(Boolean).join(' · ')}</p>}
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
