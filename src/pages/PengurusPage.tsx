import React, { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { MemberCard } from '../components/cards/MemberCard'
import { formatNis } from '../lib/nis'
import {
  UserCheck,
  Search,
  Download,
  Eye,
  UserMinus,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react'

interface PengurusItem {
  id: number
  kode_qr: string | null
  nama_lengkap: string
  kelas: string
  jurusan: string
  nis: string | null
  jenis_kelamin: 'L' | 'P' | null
  jabatan: 'Anggota' | 'Pengurus'
  status: 'Aktif' | 'Nonaktif'
  barcode?: {
    kode_unik: string
    qr_value: string
  }
}

export const PengurusPage: React.FC = () => {
  const [pengurusList, setPengurusList] = useState<PengurusItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [previewCard, setPreviewCard] = useState<PengurusItem | null>(null)

  const fetchPengurus = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('anggota')
        .select(`
          *,
          barcode:barcode (
            kode_unik,
            qr_value
          )
        `)
        .eq('jabatan', 'Pengurus')
        .eq('is_deleted', false)
        .order('nama_lengkap', { ascending: true })

      if (!error && data) {
        const formatted = data.map((item: any) => ({
          ...item,
          barcode: Array.isArray(item.barcode) ? item.barcode[0] : item.barcode,
        }))
        setPengurusList(formatted)
      }
    } catch (err) {
      console.error('Error fetching pengurus:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPengurus()
  }, [])

  const filteredPengurus = pengurusList.filter((p) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      p.nama_lengkap.toLowerCase().includes(q) ||
      formatNis(p.nis).toLowerCase().includes(q) ||
      p.kelas.toLowerCase().includes(q) ||
      p.jurusan.toLowerCase().includes(q)
    )
  })

  // Demote pengurus to regular member
  const handleDemote = async (item: PengurusItem) => {
    if (!window.confirm(`Ubah status "${item.nama_lengkap}" menjadi Anggota biasa?`)) return

    try {
      await supabase
        .from('anggota')
        .update({ jabatan: 'Anggota' })
        .eq('id', item.id)

      await fetchPengurus()
    } catch (err) {
      console.error(err)
      alert('Gagal mengubah jabatan.')
    }
  }

  const handleExportCSV = () => {
    const rows = filteredPengurus.map((p, idx) => ({
      No: idx + 1,
      'Kode Unik': p.barcode?.kode_unik || p.kode_qr || '-',
      'Nama Lengkap': p.nama_lengkap,
      Kelas: p.kelas,
      Jurusan: p.jurusan,
      NIS: formatNis(p.nis),
      'Jenis Kelamin': p.jenis_kelamin || '',
      Jabatan: 'Pengurus',
      Status: p.status,
    }))

    const csvStr = Papa.unparse(rows)
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Data_Pengurus_NKKSmart_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-pink-400" />
            <span>Data Pengurus Ekstrakurikuler</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Total {filteredPengurus.length} pengurus aktif terdaftar
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari pengurus berdasarkan nama, NIS, kelas..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
            <p className="text-xs">Memuat data pengurus...</p>
          </div>
        ) : filteredPengurus.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-500 mb-2" />
            <p className="text-sm">Tidak ada pengurus yang ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800 text-slate-400 border-b border-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">No</th>
                  <th className="p-3.5">Kode Unik</th>
                  <th className="p-3.5">Nama Lengkap</th>
                  <th className="p-3.5">Kelas & Jurusan</th>
                  <th className="p-3.5">NIS</th>
                  <th className="p-3.5">L/P</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredPengurus.map((item, index) => {
                  const kode = item.barcode?.kode_unik || item.kode_qr || '-'
                  return (
                    <tr key={item.id} className="hover:bg-slate-700/20 transition">
                      <td className="p-3.5 text-slate-500">{index + 1}</td>
                      <td className="p-3.5 font-mono text-pink-400 font-semibold">{kode}</td>
                      <td className="p-3.5 font-medium text-slate-100">{item.nama_lengkap}</td>
                      <td className="p-3.5 text-slate-300">
                        {item.kelas} {item.jurusan}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400">{formatNis(item.nis) || '-'}</td>
                      <td className="p-3.5 text-slate-400">{item.jenis_kelamin || '-'}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewCard(item)}
                            title="Lihat Kartu Pengurus"
                            className="p-1.5 hover:bg-slate-700 text-pink-400 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDemote(item)}
                            title="Turunkan ke Anggota"
                            className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Preview Kartu Pengurus */}
      {previewCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full">
            <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Preview Kartu Pengurus</h3>
              <button onClick={() => setPreviewCard(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <MemberCard
              id={previewCard.id}
              nama={previewCard.nama_lengkap}
              kelas={previewCard.kelas}
              jurusan={previewCard.jurusan}
              nis={previewCard.nis}
              kodeUnik={previewCard.barcode?.kode_unik || previewCard.kode_qr || 'NKKP-0000'}
              qrValue={previewCard.barcode?.qr_value || `NKKSMART|MEMBER|${previewCard.kode_qr}`}
              jabatan="Pengurus"
              showActions={true}
            />

            <button
              onClick={() => setPreviewCard(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
