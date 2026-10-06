import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculates Haversine distance in meters between two lat/lng coordinates.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(R * c)
}

/**
 * Fallback Web Audio API synthesizer beep for scan notifications.
 */
export function playSynthesizedBeep(success: boolean) {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.value = success ? 960 : 260
    gain.gain.value = 0.08

    osc.start()
    setTimeout(() => {
      osc.stop()
      ctx.close()
    }, success ? 120 : 200)
  } catch (e) {
    console.warn('Synthesized beep warning:', e)
  }
}

/**
 * Format date string into Indonesian readable date.
 */
export function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function formatTime(timeStr?: string | null): string {
  if (!timeStr) return '-'
  return timeStr.slice(0, 5)
}

/**
 * Normalizes class and jurusan matching PHP logic
 */
export function parseClassAndJurusan(kelasInput: string, jurusanInput?: string | null) {
  const raw = (kelasInput || '').trim()
  let jurusan = (jurusanInput || '').trim()

  if (!raw) {
    return { kelas: 'X', jurusan: jurusan || '-', tingkat: 'X' }
  }

  const match = raw.match(/^(XII|XI|X)\s*[- ]?\s*(.*)$/i)
  if (match) {
    const kelas = match[1].toUpperCase()
    const tail = match[2].trim()
    if (!jurusan) {
      jurusan = tail !== '' ? tail : '-'
    }
    return { kelas, jurusan, tingkat: kelas }
  }

  const normalized = raw.toUpperCase().startsWith('XI') ? 'XI' : 'X'
  return { kelas: normalized, jurusan: jurusan || raw, tingkat: normalized }
}

export function classRequiresNis(kelas: string): boolean {
  const k = (kelas || '').trim().toUpperCase()
  return k === 'XI' || k === 'XII'
}

