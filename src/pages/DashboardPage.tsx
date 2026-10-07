import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { formatDateIndo, formatTime } from '../lib/utils'
import {
  Users,
  UserCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  QrCode,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  XCircle,
  UserMinus,
  UserPlus,
} from 'lucide-react'

interface DashboardStats {
  anggota: number
  pengurus: number
  pertemuan: number
}

interface TodayMeeting {
  id: number
  nama_pertemuan: string
  pertemuan_ke: number
  tanggal: string
  jam_mulai_scan: string
  jam_akhir_scan: string
  manual_active: boolean
  is_libur: boolean
}

interface AttendanceRow {
  anggota_id: number
  nama_lengkap: string
  kelas: string
  jurusan: string
  nis: string | null
  jabatan: string
  scan_time?: string
}

interface MeetingAttendance {
  id: number
  nama_pertemuan: string
  pertemuan_ke: number
  tanggal: string
  jam_mulai_scan: string
  jam_akhir_scan: string
  manual_active: boolean
  is_libur: boolean
  hadir: number
}

const jakartaToday = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

const jakartaClock = () => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date())

const getMeetingSummary = (meetings: MeetingAttendance[], totalActive: number) => {
  const eligible = meetings.filter((meeting) => !meeting.is_libur)
  const averageCount = eligible.length ? Math.round(eligible.reduce((sum, meeting) => sum + meeting.hadir, 0) / eligible.length) : 0
  const averagePercent = totalActive && eligible.length
    ? Math.round(eligible.reduce((sum, meeting) => sum + meeting.hadir, 0) / (eligible.length * totalActive) * 100)
    : 0
  return { averageCount, averagePercent }
}

export const DashboardPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [stats, setStats] = useState<DashboardStats>({
    anggota: 0,
    pengurus: 0,
    pertemuan: 0,
  })
  const [todayMeeting, setTodayMeeting] = useState<TodayMeeting | null>(null)
  const [hadirList, setHadirList] = useState<AttendanceRow[]>([])
  const [tidakHadirList, setTidakHadirList] = useState<AttendanceRow[]>([])
  const [meetingLimit, setMeetingLimit] = useState<5 | 8 | 12>(() => {
    const saved = Number(localStorage.getItem('nkk-dashboard-meeting-limit'))
    return saved === 5 || saved === 8 || saved === 12 ? saved : 8
  })
  const [todayInJakarta, setTodayInJakarta] = useState(jakartaToday)
  const [clockInJakarta, setClockInJakarta] = useState(jakartaClock)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  useEffect(() => {
    localStorage.setItem('nkk-dashboard-meeting-limit', String(meetingLimit))
  }, [meetingLimit])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTodayInJakarta(jakartaToday())
      setClockInJakarta(jakartaClock())
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const meetingAttendanceQuery = useQuery({
    queryKey: ['dashboard', 'meeting-attendance', meetingLimit],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: meetings, error: meetingError } = await supabase
        .from('pertemuan')
        .select('id,nama_pertemuan,pertemuan_ke,tanggal,jam_mulai_scan,jam_akhir_scan,manual_active,is_libur')
        .lte('tanggal', jakartaToday())
        .order('tanggal', { ascending: false })
        .order('pertemuan_ke', { ascending: false })
        .limit(meetingLimit)

      if (meetingError) throw meetingError
      if (!meetings?.length) return [] as MeetingAttendance[]

      const attendance: Array<{ pertemuan_id: number; anggota_id: number }> = []
      const pageSize = 1000
      for (let from = 0; ; from += pageSize) {
        const { data, error: attendanceError } = await supabase
          .from('absensi')
          .select('pertemuan_id,anggota_id,anggota:anggota_id!inner(status,is_deleted)')
          .in('pertemuan_id', meetings.map((meeting) => meeting.id))
          .eq('status', 'hadir')
          .eq('anggota.status', 'Aktif')
          .eq('anggota.is_deleted', false)
          .range(from, from + pageSize - 1)

        if (attendanceError) throw attendanceError
        attendance.push(...(data || []))
        if (!data || data.length < pageSize) break
      }
      const counts = new Map<number, number>()
      attendance.forEach(({ pertemuan_id }) => counts.set(pertemuan_id, (counts.get(pertemuan_id) || 0) + 1))
      return meetings
        .map((meeting) => ({ ...meeting, hadir: counts.get(meeting.id) || 0 }))
        .reverse()
    },
  })

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // 1. Fetch Stats
      const [anggotaRes, pengurusRes, pertemuanRes] = await Promise.all([
        supabase.from('anggota').select('*', { count: 'exact', head: true }).eq('is_deleted', false).eq('status', 'Aktif').eq('jabatan', 'Anggota'),
        supabase.from('anggota').select('*', { count: 'exact', head: true }).eq('is_deleted', false).eq('status', 'Aktif').eq('jabatan', 'Pengurus'),
        supabase.from('pertemuan').select('*', { count: 'exact', head: true }),
      ])

      setStats({
        anggota: anggotaRes.count || 0,
        pengurus: pengurusRes.count || 0,
        pertemuan: pertemuanRes.count || 0,
      })

      // 2. Fetch Pertemuan Hari Ini atau Pertemuan Aktif Terakhir
      const { data: meetings } = await supabase
        .from('pertemuan')
        .select('*')
        .lte('tanggal', jakartaToday())
        .order('tanggal', { ascending: false })
        .order('pertemuan_ke', { ascending: false })
        .order('jam_mulai_scan', { ascending: false })
        .limit(1)

      const activeMeeting = meetings && meetings.length > 0 ? (meetings[0] as TodayMeeting) : null
      setTodayMeeting(activeMeeting)

      if (activeMeeting) {
        // Fetch yang sudah absen
        const { data: absensiRows } = await supabase
          .from('absensi')
          .select(`
            scan_time,
            status,
            anggota:anggota_id (
              id,
              nama_lengkap,
              kelas,
              jurusan,
              nis,
              jabatan,
              is_deleted,
              status
            )
          `)
          .eq('pertemuan_id', activeMeeting.id)
          .eq('status', 'hadir')

        const attended: AttendanceRow[] = []
        const attendedIds = new Set<number>()

        if (absensiRows) {
          for (const item of absensiRows) {
            const a = (item as unknown as { anggota: AttendanceRow & { id: number } }).anggota
            if (a) {
              attended.push({
                anggota_id: a.id,
                nama_lengkap: a.nama_lengkap,
                kelas: a.kelas,
                jurusan: a.jurusan,
                nis: a.nis,
                jabatan: a.jabatan,
                scan_time: item.scan_time,
              })
              attendedIds.add(a.id)
            }
          }
        }
        attended.sort((a, b) => (a.jabatan === 'Pengurus' ? -1 : 1))
        setHadirList(attended)

        // Fetch yang belum absen (anggota aktif yang belum ada di absensi pertemuan ini)
        const { data: allActiveAnggota } = await supabase
          .from('anggota')
          .select('id, nama_lengkap, kelas, jurusan, nis, jabatan')
          .eq('is_deleted', false)
          .eq('status', 'Aktif')

        if (allActiveAnggota) {
          const unattended: AttendanceRow[] = allActiveAnggota
            .filter((a) => !attendedIds.has(a.id))
            .map((a) => ({
              anggota_id: a.id,
              nama_lengkap: a.nama_lengkap,
              kelas: a.kelas,
              jurusan: a.jurusan,
              nis: a.nis,
              jabatan: a.jabatan,
            }))
          unattended.sort((a, b) => (a.jabatan === 'Pengurus' ? -1 : 1))
          setTidakHadirList(unattended)
        }
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Toggle Kehadiran Cepat (Manual Hadir / Hapus Absensi)
  const handleToggleAttendance = async (anggotaId: number, setHadir: boolean) => {
    if (!todayMeeting) return
    setActionLoadingId(anggotaId)

    try {
      if (setHadir) {
        // Ambil barcode anggota
        const { data: bc } = await supabase
          .from('barcode')
          .select('id')
          .eq('anggota_id', anggotaId)
          .maybeSingle()

        if (!bc) {
          alert('Barcode anggota tidak ditemukan.')
          return
        }

        await supabase.from('absensi').insert({
          pertemuan_id: todayMeeting.id,
          anggota_id: anggotaId,
          barcode_id: bc.id,
          status: 'hadir',
          scan_time: new Date().toISOString(),
        })
      } else {
        // Hapus absensi
        await supabase
          .from('absensi')
          .delete()
          .eq('pertemuan_id', todayMeeting.id)
          .eq('anggota_id', anggotaId)
      }

      await loadDashboardData()
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'meeting-attendance'] })
    } catch (err) {
      console.error('Toggle attendance error:', err)
    } finally {
      setActionLoadingId(null)
    }
  }

  const meetingChartData = meetingAttendanceQuery.data || []
  const totalActive = stats.anggota + stats.pengurus
  const { averageCount, averagePercent } = getMeetingSummary(meetingChartData, totalActive)
  const latestMeeting = meetingChartData.at(-1)
  const latestIsLive = Boolean(latestMeeting && latestMeeting.tanggal === todayInJakarta && !latestMeeting.is_libur && (
    latestMeeting.manual_active || (clockInJakarta >= latestMeeting.jam_mulai_scan.slice(0, 5) && clockInJakarta <= latestMeeting.jam_akhir_scan.slice(0, 5))
  ))

  return (
    <div className="space-y-6">
      {/* Header Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-800 to-slate-800/60 p-5 rounded-2xl border border-slate-700/60 shadow-lg">
        <div className="flex items-center gap-4">
          <img src="/img/nkk.png" alt="Logo NKK" className="w-14 h-14 object-contain rounded-xl drop-shadow" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">NKK Bahasa Jepang</h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Dashboard absensi gabungan Anggota & Pengurus berbasis Supabase
            </p>
          </div>
        </div>
        <Link
          to="/admin/scan"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-pink-900/30 transition"
        >
          <QrCode className="w-4 h-4" />
          <span>Buka Scanner Kamera</span>
        </Link>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Anggota */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Anggota</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.anggota}</p>
            <span className="text-[11px] text-pink-400 flex items-center gap-1 mt-1">
              Kelas X & XI aktif
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-pink-500/15 text-pink-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Pengurus */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Pengurus</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.pengurus}</p>
            <span className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
              Pengurus inti & divisi
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Pertemuan */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Pertemuan</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.pertemuan}</p>
            <span className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
              Jadwal terdaftar
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
            <CalendarDays className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Pertemuan Terakhir */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-slate-400">Pertemuan Terakhir</p>
              {latestIsLive && <span className="rounded-full bg-pink-500/15 px-2 py-0.5 text-[10px] font-semibold text-pink-400">Berlangsung</span>}
            </div>
            <p className="text-2xl font-bold text-white mt-1">{latestMeeting?.is_libur ? 'Libur' : latestMeeting ? `${latestMeeting.hadir}/${totalActive}` : '—'}</p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {latestMeeting ? `${latestMeeting.nama_pertemuan} · ${formatDateIndo(latestMeeting.tanggal)}${latestMeeting.is_libur ? ' · Libur' : ` · ${totalActive ? Math.round(latestMeeting.hadir / totalActive * 100) : 0}%`}` : 'Belum ada pertemuan yang berlangsung'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-pink-500/15 text-pink-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Kehadiran per Pertemuan */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Kehadiran per Pertemuan</h2>
              <p className="text-xs text-slate-400">Hadir per pertemuan · rata-rata {averageCount} orang ({averagePercent}%)</p>
            </div>
          </div>
          <div className="inline-flex w-fit rounded-lg border border-slate-700 bg-slate-900/70 p-1" aria-label="Jumlah pertemuan pada grafik">
            {([5, 8, 12] as const).map((count) => <button key={count} type="button" onClick={() => setMeetingLimit(count)} aria-pressed={meetingLimit === count} className={`min-h-9 min-w-10 rounded-md px-2 text-xs font-semibold transition ${meetingLimit === count ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}>{count}</button>)}
          </div>
        </div>

        {isLoading || meetingAttendanceQuery.isLoading ? <div className="h-52 animate-pulse rounded-xl bg-slate-700/40" aria-label="Memuat grafik kehadiran" />
          : meetingAttendanceQuery.isError ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-300">Gagal memuat statistik pertemuan.</div>
          : meetingChartData.length === 0 ? <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 text-center"><CalendarDays className="mb-2 h-8 w-8 text-slate-500"/><p className="text-sm text-slate-300">Belum ada pertemuan yang berlangsung</p></div>
          : <div className="overflow-x-auto pb-2">
              <div className="relative h-52 min-w-full" style={{ minWidth: meetingChartData.length > 8 ? `${meetingChartData.length * 58}px` : undefined }}>
                <div className="pointer-events-none absolute inset-x-0 top-3 bottom-10 flex flex-col justify-between text-[10px] text-slate-500">
                  {[totalActive, Math.round(totalActive / 2), 0].map((tick, index) => <div key={index} className="flex items-center gap-2"><span className="w-8 text-right">{tick}</span><span className="h-px flex-1 bg-slate-700/60" /></div>)}
                </div>
                <div className="absolute top-3 bottom-10 left-11 right-1 flex items-end justify-around gap-2 sm:gap-3">
                  {meetingChartData.map((meeting) => {
                    const percent = totalActive ? Math.round(meeting.hadir / totalActive * 100) : 0
                    const height = totalActive ? Math.max(meeting.hadir ? 2 : 0, meeting.hadir / totalActive * 100) : 0
                    const fullDate = formatDateIndo(meeting.tanggal)
                    return <Link key={meeting.id} to={`/pertemuan/${meeting.id}`} title={`${meeting.nama_pertemuan} · ${fullDate} · ${meeting.is_libur ? 'Libur' : `Hadir ${meeting.hadir} dari ${totalActive} (${percent}%)`}`} aria-label={`${meeting.nama_pertemuan}, ${fullDate}, ${meeting.is_libur ? 'Libur' : `${meeting.hadir} hadir dari ${totalActive}, ${percent} persen`}`} className="group flex h-full min-w-8 flex-1 flex-col items-center justify-end gap-1 text-center focus-visible:rounded-md">
                      <span className="h-4 text-[11px] font-bold text-white">{meeting.is_libur ? '—' : meeting.hadir}</span>
                      <div className={`relative w-full max-w-12 overflow-hidden rounded-t-md transition group-hover:brightness-125 ${meeting.is_libur ? 'border border-slate-500/70 bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,#94a3b822_5px,#94a3b822_9px)]' : 'bg-gradient-to-t from-pink-700 to-rose-400'}`} style={{ height: `${height}%`, minHeight: meeting.is_libur ? '18px' : meeting.hadir ? '3px' : '0px' }} />
                      <span className={`h-4 text-[10px] font-semibold ${meeting.is_libur ? 'text-slate-400' : 'text-pink-300'}`}>{meeting.is_libur ? 'Libur' : `${percent}%`}</span>
                    </Link>
                  })}
                </div>
                <div className="absolute bottom-0 left-11 right-1 flex justify-around gap-2 sm:gap-3">
                  {meetingChartData.map((meeting) => <Link key={meeting.id} to={`/pertemuan/${meeting.id}`} className="flex min-w-8 flex-1 flex-col items-center text-[10px] leading-tight text-slate-400 hover:text-white"><span className="whitespace-nowrap">Pert. {meeting.pertemuan_ke}</span><span className="whitespace-nowrap">{new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(`${meeting.tanggal}T12:00:00+07:00`))}</span></Link>)}
                </div>
              </div>
            </div>}
      </div>

      {/* Pertemuan Terkini & Live Attendance Panel */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/50 pb-4">
          <div>
            <h2 className="text-base font-bold text-white">Status Pertemuan Terkini</h2>
            {todayMeeting ? (
              <p className="text-xs text-slate-300 mt-1">
                <strong>{todayMeeting.nama_pertemuan}</strong> (Pertemuan ke-{todayMeeting.pertemuan_ke}) &bull;{' '}
                {formatDateIndo(todayMeeting.tanggal)}, {formatTime(todayMeeting.jam_mulai_scan)} - {formatTime(todayMeeting.jam_akhir_scan)} WIB
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">Belum ada pertemuan yang dijadwalkan.</p>
            )}
          </div>
          {todayMeeting && (
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 font-semibold border border-pink-500/30">
                Hadir: {hadirList.length}
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-slate-700 text-slate-300 font-semibold">
                Belum: {tidakHadirList.length}
              </span>
            </div>
          )}
        </div>

        {todayMeeting ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Hadir Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sudah Absen ({hadirList.length})</span>
                </h3>
              </div>
              <div className="border border-slate-700/60 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                {hadirList.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500 text-center">Belum ada yang absen pada pertemuan ini.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800 text-slate-400 border-b border-slate-700 sticky top-0">
                      <tr>
                        <th className="p-2.5">Nama</th>
                        <th className="p-2.5">Kelas</th>
                        <th className="p-2.5">Jam Scan</th>
                        <th className="p-2.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40">
                      {hadirList.map((row) => (
                        <tr key={row.anggota_id} className="hover:bg-slate-700/20">
                          <td className="p-2.5 font-medium text-slate-200">
                            <div>{row.nama_lengkap}</div>
                            {row.jabatan === 'Pengurus' && (
                              <span className="text-[10px] text-rose-400 font-normal">Pengurus</span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-400">
                            {row.kelas} {row.jurusan}
                          </td>
                          <td className="p-2.5 text-slate-400">
                            {row.scan_time ? new Date(row.scan_time).toLocaleTimeString('id-ID') : '-'}
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => handleToggleAttendance(row.anggota_id, false)}
                              disabled={actionLoadingId === row.anggota_id}
                              title="Tandai Tidak Hadir"
                              className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-[11px] transition"
                            >
                              Batal
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Belum Hadir Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>Belum Absen ({tidakHadirList.length})</span>
                </h3>
              </div>
              <div className="border border-slate-700/60 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                {tidakHadirList.length === 0 ? (
                  <p className="p-4 text-xs text-pink-400 text-center">Semua anggota telah hadir!</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800 text-slate-400 border-b border-slate-700 sticky top-0">
                      <tr>
                        <th className="p-2.5">Nama</th>
                        <th className="p-2.5">Kelas</th>
                        <th className="p-2.5">Jabatan</th>
                        <th className="p-2.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40">
                      {tidakHadirList.map((row) => (
                        <tr key={row.anggota_id} className="hover:bg-slate-700/20">
                          <td className="p-2.5 font-medium text-slate-200">{row.nama_lengkap}</td>
                          <td className="p-2.5 text-slate-400">
                            {row.kelas} {row.jurusan}
                          </td>
                          <td className="p-2.5 text-slate-400">{row.jabatan}</td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => handleToggleAttendance(row.anggota_id, true)}
                              disabled={actionLoadingId === row.anggota_id}
                              title="Tandai Hadir Manual"
                              className="px-2 py-1 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 rounded text-[11px] transition"
                            >
                              Hadir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 mx-auto text-slate-500 mb-2" />
            <p>Tidak ada data pertemuan aktif. Buat jadwal pertemuan baru di menu Jadwal Pertemuan.</p>
          </div>
        )}
      </div>
    </div>
  )
}
