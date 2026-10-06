import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { formatDateIndo, formatTime } from '../lib/utils'
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react'

interface PertemuanOption {
  id: number
  nama_pertemuan: string
  pertemuan_ke: number
  tanggal: string
  jam_mulai_scan: string
  jam_akhir_scan: string
  keterangan: string | null
}

interface RekapItem {
  anggota_id: number
  nama_lengkap: string
  kelas: string
  jurusan: string
  nis: string | null
  jabatan: string
  status_hadir: 'hadir' | 'tidak_hadir'
  scan_time?: string
}

export const RekapPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialPertemuanId = searchParams.get('pertemuan_id')

  const [pertemuanList, setPertemuanList] = useState<PertemuanOption[]>([])
  const [selectedPertemuanId, setSelectedPertemuanId] = useState<number | null>(
    initialPertemuanId ? parseInt(initialPertemuanId, 10) : null
  )

  const [rekapData, setRekapData] = useState<RekapItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterKelas, setFilterKelas] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Fetch daftar pertemuan
  useEffect(() => {
    supabase
      .from('pertemuan')
      .select('id, nama_pertemuan, pertemuan_ke, tanggal, jam_mulai_scan, jam_akhir_scan, keterangan')
      .order('tanggal', { ascending: false })
      .order('pertemuan_ke', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPertemuanList(data as PertemuanOption[])
          if (!selectedPertemuanId) {
            setSelectedPertemuanId(data[0].id)
          }
        }
      })
  }, [])

  // Fetch data absensi untuk pertemuan terpilih
  const fetchRekap = async (pertemuanId: number) => {
    setIsLoading(true)
    try {
      // 1. Ambil semua anggota aktif
      const { data: allAnggota } = await supabase
        .from('anggota')
        .select('id, nama_lengkap, kelas, jurusan, nis, jabatan')
        .eq('is_deleted', false)
        .eq('status', 'Aktif')
        .order('kelas', { ascending: true })
        .order('nama_lengkap', { ascending: true })

      // 2. Ambil absensi pada pertemuan ini
      const { data: absensiRows } = await supabase
        .from('absensi')
        .select('anggota_id, scan_time, status')
        .eq('pertemuan_id', pertemuanId)
        .eq('status', 'hadir')

      const attendedMap = new Map<number, string>()
      if (absensiRows) {
        absensiRows.forEach((r) => attendedMap.set(r.anggota_id, r.scan_time))
      }

      if (allAnggota) {
        const combined: RekapItem[] = allAnggota.map((a) => {
          const isHadir = attendedMap.has(a.id)
          return {
            anggota_id: a.id,
            nama_lengkap: a.nama_lengkap,
            kelas: a.kelas,
            jurusan: a.jurusan,
            nis: a.nis,
            jabatan: a.jabatan,
            status_hadir: isHadir ? 'hadir' : 'tidak_hadir',
            scan_time: attendedMap.get(a.id),
          }
        })
        setRekapData(combined)
      }
    } catch (err) {
      console.error('Error fetching rekap:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedPertemuanId) {
      fetchRekap(selectedPertemuanId)
      setSearchParams({ pertemuan_id: selectedPertemuanId.toString() })
    }
  }, [selectedPertemuanId])

  const selectedPertemuan = useMemo(() => {
    return pertemuanList.find((p) => p.id === selectedPertemuanId) || null
  }, [pertemuanList, selectedPertemuanId])

  const filteredRekap = useMemo(() => {
    return rekapData.filter((r) => {
      if (filterKelas !== 'all' && r.kelas !== filterKelas) return false
      if (filterStatus !== 'all' && r.status_hadir !== filterStatus) return false
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        return (
          r.nama_lengkap.toLowerCase().includes(q) ||
          (r.nis || '').includes(q) ||
          r.jurusan.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [rekapData, filterKelas, filterStatus, searchTerm])

  const totalHadir = rekapData.filter((r) => r.status_hadir === 'hadir').length
  const totalTidakHadir = rekapData.filter((r) => r.status_hadir === 'tidak_hadir').length

  // Export CSV
  const handleExportCSV = () => {
    if (!selectedPertemuan) return

    const exportRows = filteredRekap.map((r, idx) => ({
      No: idx + 1,
      'Nama Lengkap': r.nama_lengkap,
      Kelas: r.kelas,
      Jurusan: r.jurusan,
      NIS: r.nis || '',
      Jabatan: r.jabatan,
      Status: r.status_hadir === 'hadir' ? 'Hadir' : 'Tidak Hadir',
      'Waktu Scan': r.scan_time ? new Date(r.scan_time).toLocaleTimeString('id-ID') : '-',
    }))

    const csvStr = Papa.unparse(exportRows)
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Rekap_Absensi_P${selectedPertemuan.pertemuan_ke}_${selectedPertemuan.tanggal}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export Word (.doc) via HTML Table kompatibel persis dengan export PHP lama
  const handleExportWord = () => {
    if (!selectedPertemuan) return

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Rekap Absensi</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; }
        table { border-collapse: collapse; width: 100%; margin-top: 15px; }
        th, td { border: 1px solid #000; padding: 6px; text-align: left; font-size: 10pt; }
        th { background-color: #f2f2f2; }
        .text-center { text-align: center; }
      </style>
      </head>
      <body>
        <h2 style="text-align:center;margin-bottom:4px;">REKAP KEHADIRAN EKSTRAKURIKULER BAHASA JEPANG</h2>
        <p style="text-align:center;margin:0 0 15px 0;"><strong>${selectedPertemuan.nama_pertemuan} (Pertemuan Ke-${selectedPertemuan.pertemuan_ke})</strong></p>
        <p style="margin:2px 0;"><strong>Tanggal:</strong> ${formatDateIndo(selectedPertemuan.tanggal)}</p>
        <p style="margin:2px 0;"><strong>Waktu Sesi:</strong> ${formatTime(selectedPertemuan.jam_mulai_scan)} - ${formatTime(selectedPertemuan.jam_akhir_scan)} WIB</p>
        <p style="margin:2px 0;"><strong>Total Hadir:</strong> ${totalHadir} | <strong>Tidak Hadir:</strong> ${totalTidakHadir}</p>
        <table>
          <thead>
            <tr>
              <th class="text-center" width="5%">No</th>
              <th>Nama Lengkap</th>
              <th>Kelas & Jurusan</th>
              <th>NIS</th>
              <th>Jabatan</th>
              <th class="text-center">Status</th>
              <th class="text-center">Waktu Scan</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRekap
              .map(
                (r, i) => `
              <tr>
                <td class="text-center">${i + 1}</td>
                <td>${r.nama_lengkap}</td>
                <td>${r.kelas} ${r.jurusan}</td>
                <td>${r.nis || '-'}</td>
                <td>${r.jabatan}</td>
                <td class="text-center">${r.status_hadir === 'hadir' ? 'Hadir' : 'Tidak Hadir'}</td>
                <td class="text-center">${r.scan_time ? new Date(r.scan_time).toLocaleTimeString('id-ID') : '-'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Rekap_Absensi_P${selectedPertemuan.pertemuan_ke}_${selectedPertemuan.tanggal}.doc`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <span>Rekapitulasi Kehadiran Pertemuan</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Lihat, filter, dan unduh data absensi per sesi pertemuan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportWord}
            disabled={!selectedPertemuan || rekapData.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Export Word</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!selectedPertemuan || rekapData.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-900/30 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Pertemuan Selector Bar - No Print */}
      <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-sm no-print">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-300">Pilih Pertemuan:</span>
          <select
            value={selectedPertemuanId || ''}
            onChange={(e) => setSelectedPertemuanId(parseInt(e.target.value, 10))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 max-w-xs"
          >
            {pertemuanList.map((p) => (
              <option key={p.id} value={p.id}>
                P{p.pertemuan_ke} - {p.nama_pertemuan} ({formatDateIndo(p.tanggal)})
              </option>
            ))}
          </select>
        </div>

        {selectedPertemuan && (
          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
              Hadir: {totalHadir}
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold">
              Tidak Hadir: {totalTidakHadir}
            </span>
          </div>
        )}
      </div>

      {/* Print Header Visible Only on Print */}
      {selectedPertemuan && (
        <div className="hidden print-only mb-4 text-center">
          <h2 className="text-lg font-bold">REKAP ABSENSI EKSTRAKURIKULER BAHASA JEPANG</h2>
          <h3 className="text-sm font-semibold">{selectedPertemuan.nama_pertemuan} (Pertemuan Ke-{selectedPertemuan.pertemuan_ke})</h3>
          <p className="text-xs mt-1">
            Tanggal: {formatDateIndo(selectedPertemuan.tanggal)} &bull; Waktu: {formatTime(selectedPertemuan.jam_mulai_scan)} - {formatTime(selectedPertemuan.jam_akhir_scan)} WIB
          </p>
          <p className="text-xs mt-0.5">
            Total Hadir: {totalHadir} orang &bull; Tidak Hadir: {totalTidakHadir} orang
          </p>
        </div>
      )}

      {/* Filter and Search Bar - No Print */}
      <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-sm no-print">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama anggota, NIS, kelas..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Semua Kelas</option>
            <option value="X">Kelas X</option>
            <option value="XI">Kelas XI</option>
            <option value="XII">Kelas XII</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Semua Status</option>
            <option value="hadir">Hadir Saja</option>
            <option value="tidak_hadir">Tidak Hadir Saja</option>
          </select>
        </div>
      </div>

      {/* Rekap Table */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-xs">Memuat rekap kehadiran...</p>
          </div>
        ) : filteredRekap.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-500 mb-2" />
            <p className="text-sm">Tidak ada data yang cocok dengan kriteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800 text-slate-400 border-b border-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">No</th>
                  <th className="p-3.5">Nama Lengkap</th>
                  <th className="p-3.5">Kelas & Jurusan</th>
                  <th className="p-3.5">NIS</th>
                  <th className="p-3.5">Jabatan</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Waktu Scan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredRekap.map((row, index) => {
                  const isHadir = row.status_hadir === 'hadir'
                  return (
                    <tr key={row.anggota_id} className="hover:bg-slate-700/20 transition">
                      <td className="p-3.5 text-slate-500">{index + 1}</td>
                      <td className="p-3.5 font-medium text-slate-100">{row.nama_lengkap}</td>
                      <td className="p-3.5 text-slate-300">
                        {row.kelas} {row.jurusan}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400">{row.nis || '-'}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            row.jabatan === 'Pengurus'
                              ? 'bg-teal-500/15 text-teal-300'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {row.jabatan}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                            isHadir
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isHadir ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Hadir</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Tidak Hadir</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-400">
                        {row.scan_time ? new Date(row.scan_time).toLocaleTimeString('id-ID') : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
