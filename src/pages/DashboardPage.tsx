import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
  hadirHariIni: number
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

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    anggota: 0,
    pengurus: 0,
    pertemuan: 0,
    hadirHariIni: 0,
  })
  const [todayMeeting, setTodayMeeting] = useState<TodayMeeting | null>(null)
  const [hadirList, setHadirList] = useState<AttendanceRow[]>([])
  const [tidakHadirList, setTidakHadirList] = useState<AttendanceRow[]>([])
  const [chartData, setChartData] = useState<Array<{ date: string; count: number }>>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // 1. Fetch Stats
      const [anggotaRes, pengurusRes, pertemuanRes] = await Promise.all([
        supabase.from('anggota').select('*', { count: 'exact', head: true }).eq('is_deleted', false).eq('jabatan', 'Anggota'),
        supabase.from('anggota').select('*', { count: 'exact', head: true }).eq('is_deleted', false).eq('jabatan', 'Pengurus'),
        supabase.from('pertemuan').select('*', { count: 'exact', head: true }),
      ])

      // Hadir hari ini (WIB)
      const todayStr = new Date().toISOString().split('T')[0]
      const { count: hadirTodayCount } = await supabase
        .from('absensi')
        .select('*', { count: 'exact', head: true })
        .gte('scan_time', `${todayStr}T00:00:00+07:00`)
        .lte('scan_time', `${todayStr}T23:59:59+07:00`)
        .eq('status', 'hadir')

      setStats({
        anggota: anggotaRes.count || 0,
        pengurus: pengurusRes.count || 0,
        pertemuan: pertemuanRes.count || 0,
        hadirHariIni: hadirTodayCount || 0,
      })

      // 2. Fetch Pertemuan Hari Ini atau Pertemuan Aktif Terakhir
      const { data: meetings } = await supabase
        .from('pertemuan')
        .select('*')
        .order('manual_active', { ascending: false })
        .order('tanggal', { ascending: false })
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

      // 3. Activity Chart (7 Hari Terakhir)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      const startDateStr = sevenDaysAgo.toISOString().split('T')[0]

      const { data: recentAbsensi } = await supabase
        .from('absensi')
        .select('scan_time')
        .gte('scan_time', `${startDateStr}T00:00:00+07:00`)
        .eq('status', 'hadir')

      const countsByDate: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        countsByDate[d.toISOString().split('T')[0]] = 0
      }

      if (recentAbsensi) {
        recentAbsensi.forEach((r) => {
          const datePart = r.scan_time.slice(0, 10)
          if (countsByDate[datePart] !== undefined) {
            countsByDate[datePart]++
          }
        })
      }

      setChartData(
        Object.entries(countsByDate).map(([date, count]) => ({ date, count }))
      )
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
    } catch (err) {
      console.error('Toggle attendance error:', err)
    } finally {
      setActionLoadingId(null)
    }
  }

  const maxChartCount = Math.max(1, ...chartData.map((c) => c.count))

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
          to="/scan"
          target="_blank"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-900/30 transition"
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
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
              Kelas X & XI aktif
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Pengurus */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Pengurus</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.pengurus}</p>
            <span className="text-[11px] text-teal-400 flex items-center gap-1 mt-1">
              Pengurus inti & divisi
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Pertemuan */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Pertemuan</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.pertemuan}</p>
            <span className="text-[11px] text-amber-400 flex items-center gap-1 mt-1">
              Jadwal terdaftar
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <CalendarDays className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Hadir Hari Ini */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Kehadiran Hari Ini</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.hadirHariIni}</p>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
              Presensi tercatat
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Activity Chart Bar */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Tren Kehadiran (7 Hari Terakhir)</h2>
          </div>
          <span className="text-xs text-slate-400">Total presensi per hari</span>
        </div>

        <div className="h-40 flex items-end gap-2 sm:gap-4 pt-6 px-2">
          {chartData.map((item) => {
            const heightPercent = Math.round((item.count / maxChartCount) * 100)
            const dateLabel = new Date(item.date).toLocaleDateString('id-ID', {
              weekday: 'short',
              day: 'numeric',
            })
            return (
              <div key={item.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 transition font-medium">
                  {item.count}
                </span>
                <div
                  style={{ height: `${Math.max(8, heightPercent)}%` }}
                  className="w-full max-w-[48px] bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-lg transition-all duration-300 group-hover:brightness-125 shadow-lg shadow-emerald-950/20"
                />
                <span className="text-[10px] text-slate-400 truncate w-full text-center">
                  {dateLabel}
                </span>
              </div>
            )
          })}
        </div>
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
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
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
                              <span className="text-[10px] text-teal-400 font-normal">Pengurus</span>
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
                  <p className="p-4 text-xs text-emerald-400 text-center">Semua anggota telah hadir!</p>
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
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded text-[11px] transition"
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
