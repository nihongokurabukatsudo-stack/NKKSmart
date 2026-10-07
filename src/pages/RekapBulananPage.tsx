import React, { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { formatDateIndo } from '../lib/utils'
import { PrintSheet, PrintTips } from '../components/print/PrintSheet'
import { printWhenReady } from '../lib/print'
import { formatNis } from '../lib/nis'
import {
  CalendarRange,
  Download,
  Printer,
  Search,
  Filter,
  Check,
  X,
  Loader2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

interface MeetingCol {
  id: number
  nama_pertemuan: string
  pertemuan_ke: number
  tanggal: string
  is_libur: boolean
}

interface MemberMatrixRow {
  id: number
  nama_lengkap: string
  kelas: string
  jurusan: string
  nis: string | null
  jenis_kelamin: string | null
  jabatan: string
  attendance: Record<number, boolean> // meetingId -> isHadir
  totalHadir: number
  percentage: number
}

export const RekapBulananPage: React.FC = () => {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear])

  const [meetings, setMeetings] = useState<MeetingCol[]>([])
  const [matrixRows, setMatrixRows] = useState<MemberMatrixRow[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterKelas, setFilterKelas] = useState<string>('all')
  const [filterJabatan, setFilterJabatan] = useState<string>('all')
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrint = async () => {
    setIsPrinting(true)
    try { await printWhenReady() } finally { setIsPrinting(false) }
  }

  // Ambil tahun yang tersedia dari tabel pertemuan
  useEffect(() => {
    supabase
      .from('pertemuan')
      .select('tanggal')
      .then(({ data }) => {
        if (data && data.length > 0) {
          const years = Array.from(
            new Set(data.map((d) => new Date(d.tanggal).getFullYear()))
          ).sort((a, b) => b - a)
          if (years.length > 0) {
            setAvailableYears(years)
            if (!years.includes(selectedYear)) {
              setSelectedYear(years[0])
            }
          }
        }
      })
  }, [])

  // Load Matrix Data untuk Bulan & Tahun terpilih
  const loadMatrixData = async () => {
    setIsLoading(true)
    try {
      // 1. Cari pertemuan di bulan & tahun terpilih
      const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`
      const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1
      const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear
      const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`

      const { data: meetingData } = await supabase
        .from('pertemuan')
        .select('id, nama_pertemuan, pertemuan_ke, tanggal, is_libur')
        .gte('tanggal', startDate)
        .lt('tanggal', endDate)
        .order('tanggal', { ascending: true })
        .order('pertemuan_ke', { ascending: true })

      const meetingCols: MeetingCol[] = meetingData || []
      setMeetings(meetingCols)

      // 2. Ambil seluruh anggota aktif
      const { data: allAnggota } = await supabase
        .from('anggota')
        .select('id, nama_lengkap, kelas, jurusan, nis, jenis_kelamin, jabatan')
        .eq('is_deleted', false)
        .eq('status', 'Aktif')
        .order('kelas', { ascending: true })
        .order('nama_lengkap', { ascending: true })

      if (!allAnggota) {
        setMatrixRows([])
        setIsLoading(false)
        return
      }

      // 3. Ambil absensi untuk pertemuan-pertemuan ini
      const meetingIds = meetingCols.map((m) => m.id)
      const attendanceMap = new Map<string, boolean>()

      if (meetingIds.length > 0) {
        const { data: absensiData } = await supabase
          .from('absensi')
          .select('pertemuan_id, anggota_id, status')
          .in('pertemuan_id', meetingIds)
          .eq('status', 'hadir')

        if (absensiData) {
          absensiData.forEach((a) => {
            attendanceMap.set(`${a.pertemuan_id}_${a.anggota_id}`, true)
          })
        }
      }

      // Hitung baris matriks
      const nonLiburCount = meetingCols.filter((m) => !m.is_libur).length

      const rows: MemberMatrixRow[] = allAnggota.map((m) => {
        const att: Record<number, boolean> = {}
        let hadirCount = 0

        meetingCols.forEach((col) => {
          const isHadir = Boolean(attendanceMap.get(`${col.id}_${m.id}`))
          att[col.id] = isHadir
          if (isHadir && !col.is_libur) {
            hadirCount++
          }
        })

        const percent = nonLiburCount > 0 ? Math.round((hadirCount / nonLiburCount) * 100) : 0

        return {
          id: m.id,
          nama_lengkap: m.nama_lengkap,
          kelas: m.kelas,
          jurusan: m.jurusan,
          nis: m.nis,
          jenis_kelamin: m.jenis_kelamin,
          jabatan: m.jabatan,
          attendance: att,
          totalHadir: hadirCount,
          percentage: percent,
        }
      })

      setMatrixRows(rows)
    } catch (err) {
      console.error('Error loading matrix:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMatrixData()
  }, [selectedYear, selectedMonth])

  // Toggle status kehadiran cell secara langsung
  const handleToggleCell = async (meetingId: number, anggotaId: number, currentlyHadir: boolean) => {
    try {
      if (currentlyHadir) {
        // Hapus absensi
        await supabase
          .from('absensi')
          .delete()
          .eq('pertemuan_id', meetingId)
          .eq('anggota_id', anggotaId)
      } else {
        // Ambil barcode
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
          pertemuan_id: meetingId,
          anggota_id: anggotaId,
          barcode_id: bc.id,
          status: 'hadir',
          scan_time: new Date().toISOString(),
        })
      }

      await loadMatrixData()
    } catch (err) {
      console.error('Toggle cell error:', err)
    }
  }

  // Filtered rows
  const filteredRows = useMemo(() => {
    return matrixRows.filter((r) => {
      if (filterKelas !== 'all' && r.kelas !== filterKelas) return false
      if (filterJabatan !== 'all' && r.jabatan !== filterJabatan) return false
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        return (
          r.nama_lengkap.toLowerCase().includes(q) ||
          formatNis(r.nis).toLowerCase().includes(q) ||
          r.jurusan.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [matrixRows, filterKelas, filterJabatan, searchTerm])

  // Export CSV Matrix
  const handleExportCSV = () => {
    const exportData = filteredRows.map((r, idx) => {
      const rowObj: Record<string, any> = {
        No: idx + 1,
        'Nama Lengkap': r.nama_lengkap,
        Kelas: `${r.kelas} ${r.jurusan}`,
        NIS: formatNis(r.nis),
        JK: r.jenis_kelamin || '',
        Jabatan: r.jabatan,
      }

      meetings.forEach((m) => {
        const colHeader = `P${m.pertemuan_ke} (${m.tanggal})`
        rowObj[colHeader] = m.is_libur ? 'Libur' : r.attendance[m.id] ? 'Hadir' : 'Alpa'
      })

      rowObj['Total Hadir'] = r.totalHadir
      rowObj['Persentase'] = `${r.percentage}%`
      return rowObj
    })

    const csvStr = Papa.unparse(exportData)
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Rekap_Bulanan_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarRange className="w-6 h-6 text-pink-400" />
            <span>Rekap Bulanan & Matriks Kehadiran</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Matriks kehadiran komparatif siswa per sesi pertemuan dalam satu bulan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={meetings.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-pink-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => void handlePrint()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-pink-900/30 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isPrinting ? 'Menyiapkan…' : 'Cetak Matriks'}</span>
          </button>
        </div>
      </div>

      {/* Month & Year Selection Bar - No Print */}
      <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-sm no-print">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Bulan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-pink-500"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Tahun:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-pink-500"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            Total Pertemuan di Bulan Ini:{' '}
            <strong className="text-pink-400 font-mono text-sm">{meetings.length}</strong>
          </span>
        </div>
      </div>

      <PrintSheet orientation="landscape" className="mt-4">
      {/* Print Title */}
      <div className="hidden print-only mb-4 text-center">
        <img src="/assets/admin/nkk.png" alt="Logo NKK" width={64} height={64} className="mx-auto mb-2 h-12 w-12 object-contain" />
        <h2 className="text-lg font-bold">MATRIKS REKAPITULASI KEHADIRAN BULANAN</h2>
        <p className="text-xs">
          Bulan: {MONTH_NAMES[selectedMonth - 1]} {selectedYear} &bull; Ekstrakurikuler Bahasa Jepang
        </p>
        <p className="mt-1 text-[9pt]">Dicetak: {new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long' }).format(new Date())}</p>
      </div>

      {/* Filter and Search Bar - No Print */}
      <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-sm no-print">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari siswa..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500"
          >
            <option value="all">Semua Kelas</option>
            <option value="X">Kelas X</option>
            <option value="XI">Kelas XI</option>
            <option value="XII">Kelas XII</option>
          </select>

          <select
            value={filterJabatan}
            onChange={(e) => setFilterJabatan(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500"
          >
            <option value="all">Semua Jabatan</option>
            <option value="Anggota">Anggota Saja</option>
            <option value="Pengurus">Pengurus Saja</option>
          </select>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
            <p className="text-xs">Memuat matriks kehadiran...</p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-500 mb-2" />
            <p className="text-sm">Tidak ada jadwal pertemuan pada bulan {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-800 text-slate-300 border-b border-slate-700 text-[11px]">
                <tr>
                  <th className="p-3">No</th>
                  <th className="p-3 min-w-[160px]">Nama Lengkap</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3">L/P</th>
                  {meetings.map((m) => (
                    <th key={m.id} className="p-2 text-center border-l border-slate-700/50 min-w-[50px]">
                      <div className="font-bold text-pink-400">P{m.pertemuan_ke}</div>
                      <div className="text-[9px] text-slate-400 font-normal">
                        {new Date(m.tanggal).getDate()}/{new Date(m.tanggal).getMonth() + 1}
                      </div>
                      {m.is_libur && (
                        <span className="text-[8px] bg-rose-500/20 text-rose-300 px-1 rounded">Libur</span>
                      )}
                    </th>
                  ))}
                  <th className="p-3 text-center border-l border-slate-700 bg-slate-800/80 font-bold">Hadir</th>
                  <th className="p-3 text-center bg-slate-800/80 font-bold">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {filteredRows.map((r, index) => (
                  <tr key={r.id} className="hover:bg-slate-700/20 transition">
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-medium text-slate-100">
                      <div>{r.nama_lengkap}</div>
                      {r.jabatan === 'Pengurus' && (
                        <span className="text-[9px] text-pink-400">Pengurus</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-300">
                      {r.kelas} {r.jurusan}
                    </td>
                    <td className="p-3 text-slate-400">{r.jenis_kelamin || '-'}</td>

                    {/* Check / Cross Cells for each meeting */}
                    {meetings.map((m) => {
                      const isHadir = r.attendance[m.id]
                      return (
                        <td
                          key={m.id}
                          className="p-2 text-center border-l border-slate-700/30"
                        >
                          {m.is_libur ? (
                            <span className="text-slate-600 text-[10px]">-</span>
                          ) : (
                            <button
                              onClick={() => handleToggleCell(m.id, r.id, isHadir)}
                              title={`${r.nama_lengkap} - P${m.pertemuan_ke}: ${isHadir ? 'Hadir (klik untuk batal)' : 'Alpa (klik untuk tandai hadir)'}`}
                              className={`w-6 h-6 rounded-md inline-flex items-center justify-center transition ${
                                isHadir
                                  ? 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30'
                                  : 'bg-slate-800 text-slate-600 hover:bg-slate-700 hover:text-slate-400'
                              }`}
                            >
                              {isHadir ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </td>
                      )
                    })}

                    <td className="p-3 text-center border-l border-slate-700 font-bold text-slate-100">
                      {r.totalHadir}
                    </td>
                    <td className="p-3 text-center font-bold">
                      <span
                        className={
                          r.percentage >= 75
                            ? 'text-pink-400'
                            : r.percentage >= 50
                            ? 'text-rose-400'
                            : 'text-rose-400'
                        }
                      >
                        {r.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </PrintSheet>
      <PrintTips />
    </div>
  )
}
