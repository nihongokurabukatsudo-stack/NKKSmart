import React, { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { parseClassAndJurusan } from '../lib/utils'
import { formatNis, memberImportKey } from '../lib/nis'
import { MemberCard } from '../components/cards/MemberCard'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Upload,
  Edit2,
  Trash2,
  QrCode,
  Check,
  X,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  Eye,
} from 'lucide-react'

interface AnggotaItem {
  id: number
  kode_qr: string | null
  nama_lengkap: string
  kelas: string
  jurusan: string
  nis: string | null
  jenis_kelamin: 'L' | 'P' | null
  jabatan: 'Anggota' | 'Pengurus'
  status: 'Aktif' | 'Nonaktif'
  is_deleted: boolean
  barcode?: {
    kode_unik: string
    qr_value: string
  }
}

export const AnggotaPage: React.FC = () => {
  const [anggotaList, setAnggotaList] = useState<AnggotaItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterKelas, setFilterKelas] = useState<string>('all')
  const [filterJabatan, setFilterJabatan] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('Aktif')

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [previewCardAnggota, setPreviewCardAnggota] = useState<AnggotaItem | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    id: 0,
    nama_lengkap: '',
    kelas: 'X',
    jurusan: '',
    nis: '',
    jenis_kelamin: 'L' as 'L' | 'P',
    jabatan: 'Anggota' as 'Anggota' | 'Pengurus',
    status: 'Aktif' as 'Aktif' | 'Nonaktif',
  })
  const [formError, setFormError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importReport, setImportReport] = useState<{
    inserted: number
    updated: number
    skipped: number
  } | null>(null)
  const [isImporting, setIsImporting] = useState<boolean>(false)

  const fetchAnggota = async () => {
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
        .order('nama_lengkap', { ascending: true })

      if (!error && data) {
        // Flatten barcode relasi
        const formatted = data.map((item: any) => ({
          ...item,
          barcode: Array.isArray(item.barcode) ? item.barcode[0] : item.barcode,
        }))
        setAnggotaList(formatted)
      }
    } catch (err) {
      console.error('Error fetching anggota:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnggota()
  }, [])

  // Filtered List
  const filteredAnggota = useMemo(() => {
    return anggotaList.filter((a) => {
      // Soft-delete filter
      if (filterStatus === 'Aktif' && (a.is_deleted || a.status !== 'Aktif')) return false
      if (filterStatus === 'Nonaktif' && (!a.is_deleted && a.status === 'Aktif')) return false

      if (filterKelas !== 'all' && a.kelas !== filterKelas) return false
      if (filterJabatan !== 'all' && a.jabatan !== filterJabatan) return false

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchNama = a.nama_lengkap.toLowerCase().includes(q)
        const matchNis = formatNis(a.nis).toLowerCase().includes(q)
        const matchJurusan = a.jurusan.toLowerCase().includes(q)
        const matchKode = (a.kode_qr || a.barcode?.kode_unik || '').toLowerCase().includes(q)
        if (!matchNama && !matchNis && !matchJurusan && !matchKode) return false
      }

      return true
    })
  }, [anggotaList, filterKelas, filterJabatan, filterStatus, searchTerm])

  // Generate Unique Code Client Helper
  const getNextUniqueCode = async (): Promise<string> => {
    const { data, error } = await supabase
      .from('barcode')
      .select('kode_unik')
    if (error) throw error

    let maxNum = 0
    if (data) {
      for (const row of data) {
        const match = row.kode_unik.match(/-(\d+)$/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNum) maxNum = num
        }
      }
    }
    const nextNum = maxNum + 1
    return `NKKP-${nextNum.toString().padStart(4, '0')}`
  }

  // Handle Save (Add or Edit)
  const handleSaveAnggota = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const parsed = parseClassAndJurusan(formData.kelas, formData.jurusan)
    const nisClean = formData.nis.trim() || null
    const nama = formData.nama_lengkap.trim()

    if (!nama) {
      setFormError('Nama lengkap wajib diisi.')
      return
    }
    setIsSubmitting(true)
    try {
      if (isAddModalOpen) {
        const uniqueCode = await getNextUniqueCode()

        // Insert anggota
        const timestamp = new Date().toISOString()
        const { data: newAnggota, error: insErr } = await supabase
          .from('anggota')
          .insert({
            kode_qr: uniqueCode,
            nama_lengkap: nama,
            kelas: parsed.kelas,
            jurusan: parsed.jurusan,
            nis: nisClean,
            jenis_kelamin: formData.jenis_kelamin,
            jabatan: formData.jabatan,
            status: formData.status,
            is_deleted: formData.status === 'Nonaktif',
            created_at: timestamp,
          })
          .select()
          .single()

        if (insErr) throw insErr

        // Insert barcode
        const { error: barcodeErr } = await supabase.from('barcode').insert({
          kode_unik: uniqueCode,
          qr_value: `NKKSMART|MEMBER|${uniqueCode}`,
          anggota_id: newAnggota.id,
          created_at: timestamp,
        })
        if (barcodeErr) {
          // The browser client cannot wrap two table writes in one transaction.
          // Remove the member row if its required barcode could not be created.
          const { error: cleanupErr } = await supabase.from('anggota').delete().eq('id', newAnggota.id)
          if (cleanupErr) console.error('Failed to roll back member after barcode insert error:', cleanupErr)
          throw barcodeErr
        }

        setIsAddModalOpen(false)
      } else if (isEditModalOpen) {
        // Update
        const { error: updErr } = await supabase
          .from('anggota')
          .update({
            nama_lengkap: nama,
            kelas: parsed.kelas,
            jurusan: parsed.jurusan,
            nis: nisClean,
            jenis_kelamin: formData.jenis_kelamin,
            jabatan: formData.jabatan,
            status: formData.status,
            is_deleted: formData.status === 'Nonaktif',
            updated_at: new Date().toISOString(),
          })
          .eq('id', formData.id)

        if (updErr) throw updErr
        setIsEditModalOpen(false)
      }

      await fetchAnggota()
    } catch (err: unknown) {
      console.error('Gagal menyimpan anggota:', err)
      setFormError(err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
        ? err.message
        : 'Gagal menyimpan anggota. Periksa koneksi dan izin database, lalu coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete / Soft-Delete
  const handleDeleteAnggota = async (item: AnggotaItem) => {
    if (!window.confirm(`Hapus anggota "${item.nama_lengkap}"?`)) return

    try {
      // Soft-delete
      const { data, error } = await supabase
        .from('anggota')
        .update({ is_deleted: true, status: 'Nonaktif' })
        .eq('id', item.id)
        .select('id')
        .maybeSingle()

      if (error) throw error
      if (!data) throw new Error('Anggota tidak ditemukan atau akun tidak memiliki izin untuk menghapusnya.')

      await fetchAnggota()
    } catch (err) {
      console.error('Delete error:', err)
      alert(err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
        ? `Gagal menghapus anggota: ${err.message}`
        : 'Gagal menghapus anggota. Periksa koneksi dan izin database.')
    }
  }

  // CSV Export
  const handleExportCSV = () => {
    const exportRows = filteredAnggota.map((a, idx) => ({
      No: idx + 1,
      'Kode Unik': a.barcode?.kode_unik || a.kode_qr || '-',
      'Nama Lengkap': a.nama_lengkap,
      Kelas: a.kelas,
      Jurusan: a.jurusan,
      NIS: formatNis(a.nis),
      'Jenis Kelamin': a.jenis_kelamin || '',
      Jabatan: a.jabatan,
      Status: a.status,
    }))

    const csvStr = Papa.unparse(exportRows)
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Data_Anggota_NKKSmart_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Download Import Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        nama: 'Contoh Siswa Baru',
        kelas: 'X',
        jurusan: 'PPLG 1',
        nis: '12528000',
        jenis_kelamin: 'L',
        jabatan: 'Anggota',
      },
    ]
    const csvStr = Papa.unparse(templateData)
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_import_anggota.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Handle CSV File Upload & Parsing
  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvFile) return

    setIsImporting(true)
    setImportReport(null)

    const { data: knownMembers, error: knownMembersError } = await supabase
      .from('anggota')
      .select('id,nama_lengkap,kelas,jurusan')
      .eq('is_deleted', false)
    if (knownMembersError) {
      console.error('Gagal memeriksa anggota untuk import:', knownMembersError)
      setIsImporting(false)
      setImportReport({ inserted: 0, updated: 0, skipped: 0 })
      setFormError('Data anggota tidak dapat diperiksa. Import belum dijalankan.')
      return
    }
    const existingByIdentity = new Map((knownMembers || []).map((member) => [memberImportKey(member.nama_lengkap, member.kelas, member.jurusan), member.id]))

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let insCount = 0
        let updCount = 0
        let skipCount = 0

        for (const row of results.data as Record<string, string>[]) {
          const rawNama = (row.nama || row.nama_lengkap || '').trim()
          const rawKelas = (row.kelas || '').trim()
          const rawJurusan = (row.jurusan || '').trim()
          const rawNis = (row.nis || '').trim()
          const rawJk = (row.jenis_kelamin || row.lp || '').trim().toUpperCase()
          const rawJabatan = (row.jabatan || 'Anggota').trim()

          const parsed = parseClassAndJurusan(rawKelas, rawJurusan)
          const nisClean = rawNis || null
          const jk = ['L', 'P'].includes(rawJk) ? (rawJk as 'L' | 'P') : null
          const jabatan = ['Anggota', 'Pengurus'].includes(rawJabatan) ? (rawJabatan as 'Anggota' | 'Pengurus') : 'Anggota'

          if (!rawNama || !['X', 'XI', 'XII'].includes(parsed.kelas)) {
            skipCount++
            continue
          }
          try {
            const identity = memberImportKey(rawNama, parsed.kelas, parsed.jurusan)
            const existingId = existingByIdentity.get(identity)

            if (existingId) {
              // Update
              await supabase
                .from('anggota')
                .update({
                  nama_lengkap: rawNama,
                  kelas: parsed.kelas,
                  jurusan: parsed.jurusan,
                  nis: nisClean,
                  jenis_kelamin: jk,
                  jabatan,
                  status: 'Aktif',
                  is_deleted: false,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingId)
              updCount++
            } else {
              // Insert new
              const uniqueCode = await getNextUniqueCode()
              const { data: newRec } = await supabase
                .from('anggota')
                .insert({
                  kode_qr: uniqueCode,
                  nama_lengkap: rawNama,
                  kelas: parsed.kelas,
                  jurusan: parsed.jurusan,
                  nis: nisClean,
                  jenis_kelamin: jk,
                  jabatan,
                  status: 'Aktif',
                  is_deleted: false,
                })
                .select()
                .single()

              if (newRec) {
                existingByIdentity.set(identity, newRec.id)
                await supabase.from('barcode').insert({
                  kode_unik: uniqueCode,
                  qr_value: `NKKSMART|MEMBER|${uniqueCode}`,
                  anggota_id: newRec.id,
                })
                insCount++
              }
            }
          } catch (err) {
            console.error('Row import error:', err)
            skipCount++
          }
        }

        setIsImporting(false)
        setImportReport({ inserted: insCount, updated: updCount, skipped: skipCount })
        await fetchAnggota()
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-pink-400" />
            <span>Data Anggota & Pengurus</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Total {filteredAnggota.length} orang terdaftar
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              setFormData({
                id: 0,
                nama_lengkap: '',
                kelas: 'X',
                jurusan: '',
                nis: '',
                jenis_kelamin: 'L',
                jabatan: 'Anggota',
                status: 'Aktif',
              })
              setFormError('')
              setIsAddModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-pink-900/30 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Anggota</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama, NIS, jurusan, kode QR..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Kelas */}
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

          {/* Filter Jabatan */}
          <select
            value={filterJabatan}
            onChange={(e) => setFilterJabatan(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500"
          >
            <option value="all">Semua Jabatan</option>
            <option value="Anggota">Anggota Saja</option>
            <option value="Pengurus">Pengurus Saja</option>
          </select>

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500"
          >
            <option value="Aktif">Status Aktif</option>
            <option value="Nonaktif">Arsip / Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Anggota Data Table */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
            <p className="text-xs">Memuat data anggota...</p>
          </div>
        ) : filteredAnggota.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-500 mb-2" />
            <p className="text-sm">Tidak ada anggota yang cocok dengan filter pencarian.</p>
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
                  <th className="p-3.5">Jabatan</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredAnggota.map((item, index) => {
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
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.jabatan === 'Pengurus'
                              ? 'bg-pink-500/15 text-pink-300 border border-pink-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {item.jabatan}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewCardAnggota(item)}
                            title="Lihat Kartu"
                            className="p-1.5 hover:bg-slate-700 text-pink-400 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setFormData({
                                id: item.id,
                                nama_lengkap: item.nama_lengkap,
                                kelas: item.kelas,
                                jurusan: item.jurusan,
                                nis: item.nis || '',
                                jenis_kelamin: item.jenis_kelamin || 'L',
                                jabatan: item.jabatan,
                                status: item.status,
                              })
                              setFormError('')
                              setIsEditModalOpen(true)
                            }}
                            title="Edit"
                            className="p-1.5 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAnggota(item)}
                            title="Hapus / Nonaktifkan"
                            className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal Add / Edit Anggota */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {isAddModalOpen ? 'Tambah Anggota Baru' : 'Edit Data Anggota'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false)
                  setIsEditModalOpen(false)
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveAnggota} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={formData.nama_lengkap}
                  onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                  placeholder="Contoh: Arti Sugiarti"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kelas *</label>
                  <select
                    value={formData.kelas}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-pink-500"
                  >
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jurusan *</label>
                  <input
                    type="text"
                    value={formData.jurusan}
                    onChange={(e) => setFormData({ ...formData, jurusan: e.target.value })}
                    placeholder="Contoh: PPLG 1"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-pink-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    NIS (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    placeholder="Nomor Induk Siswa"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.jenis_kelamin}
                    onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-pink-500"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jabatan</label>
                  <select
                    value={formData.jabatan}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value as 'Anggota' | 'Pengurus' })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-pink-500"
                  >
                    <option value="Anggota">Anggota</option>
                    <option value="Pengurus">Pengurus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Aktif' | 'Nonaktif' })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-pink-500"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false)
                    setIsEditModalOpen(false)
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Kartu Anggota */}
      {previewCardAnggota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full">
            <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Preview Kartu Anggota</h3>
              <button
                onClick={() => setPreviewCardAnggota(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <MemberCard
              id={previewCardAnggota.id}
              nama={previewCardAnggota.nama_lengkap}
              kelas={previewCardAnggota.kelas}
              jurusan={previewCardAnggota.jurusan}
              nis={previewCardAnggota.nis}
              kodeUnik={previewCardAnggota.barcode?.kode_unik || previewCardAnggota.kode_qr || 'NKKP-0000'}
              qrValue={previewCardAnggota.barcode?.qr_value || `NKKSMART|MEMBER|${previewCardAnggota.kode_qr}`}
              jabatan={previewCardAnggota.jabatan}
              showActions={true}
            />

            <button
              onClick={() => setPreviewCardAnggota(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Import CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Import Data Anggota via CSV</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportCSV} className="mt-4 space-y-4 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Gunakan template CSV untuk memastikan struktur kolom sesuai (nama, kelas, jurusan, nis, jenis_kelamin, jabatan).
              </p>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200">Template Import</p>
                  <p className="text-[11px] text-slate-400">template_import_anggota.csv</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                >
                  Unduh
                </button>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Pilih File CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-pink-600 file:text-white"
                  required
                />
              </div>

              {importReport && (
                <div className="p-3 bg-pink-500/10 border border-pink-500/30 text-pink-300 rounded-xl space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Import Selesai!</span>
                  </p>
                  <p>Data baru ditambahkan: {importReport.inserted}</p>
                  <p>Data diperbarui: {importReport.updated}</p>
                  <p>Data dilewati: {importReport.skipped}</p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isImporting || !csvFile}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-1.5"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>Mulai Import</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
