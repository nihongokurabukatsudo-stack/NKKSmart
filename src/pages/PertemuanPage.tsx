import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDateIndo, formatTime } from '../lib/utils'
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  X,
  Check,
  Search,
  Users,
  ChevronRight,
  UserX,
  UserCheck
} from 'lucide-react'

interface PertemuanItem {
  id: number
  nama_pertemuan: string
  pertemuan_ke: number
  tanggal: string
  jam_mulai_scan: string
  jam_akhir_scan: string
  keterangan: string | null
  manual_active: boolean
  is_libur: boolean
  absensi_count?: number
}

interface Anggota {
  id: number
  nama_lengkap: string
  kelas: string
  jurusan: string
  jabatan: string
  kode_qr: string
}

interface AbsensiRecord {
  id: number
  scan_time: string
  anggota: Anggota
}

export const PertemuanPage: React.FC = () => {
  const navigate = useNavigate()
  const [pertemuanList, setPertemuanList] = useState<PertemuanItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  
  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [formData, setFormData] = useState({
    id: 0,
    nama_pertemuan: '',
    pertemuan_ke: 1,
    tanggal: new Date().toISOString().slice(0, 10),
    jam_mulai_scan: '15:30',
    jam_akhir_scan: '17:30',
    keterangan: '',
    manual_active: false,
    is_libur: false,
  })
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Detail Modal State
  const [selectedMeeting, setSelectedMeeting] = useState<PertemuanItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>([])
  const [allActiveAnggota, setAllActiveAnggota] = useState<Anggota[]>([])
  const [activeTab, setActiveTab] = useState<'hadir' | 'tidak_hadir'>('hadir')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchPertemuan = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('pertemuan')
        .select(`
          *,
          absensi:absensi(status)
        `)
        .order('tanggal', { ascending: false })
        .order('pertemuan_ke', { ascending: false })

      if (!error && data) {
        const formatted = data.map((p: any) => ({
          ...p,
          absensi_count: p.absensi?.filter((record: { status: string }) => record.status === 'hadir').length || 0,
        }))
        setPertemuanList(formatted)
      }
    } catch (err) {
      console.error('Error fetching pertemuan:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPertemuan()
  }, [])

  // Toggle manual_active
  const handleToggleManual = async (e: React.MouseEvent, item: PertemuanItem) => {
    e.stopPropagation()
    try {
      const newStatus = !item.manual_active
      await supabase
        .from('pertemuan')
        .update({ manual_active: newStatus })
        .eq('id', item.id)

      await fetchPertemuan()
      if (selectedMeeting?.id === item.id) {
        setSelectedMeeting({ ...selectedMeeting, manual_active: newStatus })
      }
    } catch (err) {
      console.error(err)
      alert('Gagal mengubah status aktif manual.')
    }
  }

  // Toggle is_libur
  const handleToggleLibur = async (e: React.MouseEvent, item: PertemuanItem) => {
    e.stopPropagation()
    try {
      const newStatus = !item.is_libur
      await supabase
        .from('pertemuan')
        .update({ is_libur: newStatus })
        .eq('id', item.id)

      await fetchPertemuan()
      if (selectedMeeting?.id === item.id) {
        setSelectedMeeting({ ...selectedMeeting, is_libur: newStatus })
      }
    } catch (err) {
      console.error(err)
      alert('Gagal mengubah status libur.')
    }
  }

  // Delete
  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!window.confirm('Hapus jadwal pertemuan ini beserta semua riwayat absensinya?')) return

    try {
      await supabase.from('pertemuan').delete().eq('id', id)
      await fetchPertemuan()
      if (selectedMeeting?.id === id) {
        setIsDetailOpen(false)
        setSelectedMeeting(null)
      }
    } catch (err) {
      console.error(err)
      alert('Gagal menghapus pertemuan.')
    }
  }

  // Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError(null)
    setIsSubmitting(true)

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('pertemuan')
          .update({
            nama_pertemuan: formData.nama_pertemuan,
            pertemuan_ke: formData.pertemuan_ke,
            tanggal: formData.tanggal,
            jam_mulai_scan: formData.jam_mulai_scan,
            jam_akhir_scan: formData.jam_akhir_scan,
            keterangan: formData.keterangan || null,
            manual_active: formData.manual_active,
            is_libur: formData.is_libur,
          })
          .eq('id', formData.id)
        if (error) throw error
        
        if (selectedMeeting?.id === formData.id) {
            setSelectedMeeting({
                ...selectedMeeting,
                nama_pertemuan: formData.nama_pertemuan,
                pertemuan_ke: formData.pertemuan_ke,
                tanggal: formData.tanggal,
                jam_mulai_scan: formData.jam_mulai_scan,
                jam_akhir_scan: formData.jam_akhir_scan,
                keterangan: formData.keterangan || null,
                manual_active: formData.manual_active,
                is_libur: formData.is_libur,
            })
        }
      } else {
        const { error } = await supabase.from('pertemuan').insert({
          nama_pertemuan: formData.nama_pertemuan,
          pertemuan_ke: formData.pertemuan_ke,
          tanggal: formData.tanggal,
          jam_mulai_scan: formData.jam_mulai_scan,
          jam_akhir_scan: formData.jam_akhir_scan,
          keterangan: formData.keterangan || null,
          manual_active: formData.manual_active,
          is_libur: formData.is_libur,
          created_at: new Date().toISOString(),
        })
        if (error) throw error
      }

      setIsModalOpen(false)
      await fetchPertemuan()
    } catch (err) {
      console.error(err)
      const dbError = err as { message?: string; details?: string; hint?: string; code?: string }
      const message = [dbError?.message, dbError?.details, dbError?.hint, dbError?.code ? `Kode: ${dbError.code}` : null]
        .filter(Boolean)
        .join(' · ') || 'Terjadi kesalahan yang tidak diketahui.'
      setSaveError(`Gagal menyimpan pertemuan: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openAddModal = () => {
    const nextKe = pertemuanList.length > 0 ? Math.max(...pertemuanList.map((p) => p.pertemuan_ke)) + 1 : 1
    setFormData({
      id: 0,
      nama_pertemuan: `Pertemuan Ke-${nextKe}`,
      pertemuan_ke: nextKe,
      tanggal: new Date().toISOString().slice(0, 10),
      jam_mulai_scan: '15:30',
      jam_akhir_scan: '17:30',
      keterangan: '',
      manual_active: false,
      is_libur: false,
    })
    setIsEditing(false)
    setSaveError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (e: React.MouseEvent | undefined, item: PertemuanItem) => {
    if(e) e.stopPropagation()
    setFormData({
      id: item.id,
      nama_pertemuan: item.nama_pertemuan,
      pertemuan_ke: item.pertemuan_ke,
      tanggal: item.tanggal,
      jam_mulai_scan: item.jam_mulai_scan.slice(0, 5),
      jam_akhir_scan: item.jam_akhir_scan.slice(0, 5),
      keterangan: item.keterangan || '',
      manual_active: item.manual_active,
      is_libur: item.is_libur,
    })
    setIsEditing(true)
    setSaveError(null)
    setIsModalOpen(true)
  }

  const openDetail = async (item: PertemuanItem) => {
    navigate(`/pertemuan/${item.id}`)
    return
    /* Legacy modal remains as a fallback reference while the detail route is in use.
    setSelectedMeeting(item)
    setIsDetailOpen(true)
    setDetailLoading(true)
    setSearchQuery('')
    setActiveTab('hadir')
    
    try {
      // Fetch absensi
      const { data: absData, error: absError } = await supabase
        .from('absensi')
        .select('id, scan_time, anggota:anggota_id(id, nama_lengkap, kelas, jurusan, jabatan, kode_qr)')
        .eq('pertemuan_id', item.id)
        .order('scan_time', { ascending: true })

      if (absError) throw absError
      // @ts-ignore
      setAbsensiList(absData || [])

      // Fetch all active members
      const { data: angData, error: angError } = await supabase
        .from('anggota')
        .select('id, nama_lengkap, kelas, jurusan, jabatan, kode_qr')
        .eq('is_deleted', false)
        .eq('status', 'Aktif')
        .order('nama_lengkap')

      if (angError) throw angError
      setAllActiveAnggota(angData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setDetailLoading(false)
    }
    */
  }

  // Calculate missing members
  const missingMembers = useMemo(() => {
    const presentIds = new Set(absensiList.map(a => a.anggota.id))
    return allActiveAnggota.filter(m => !presentIds.has(m.id))
  }, [absensiList, allActiveAnggota])

  // Filter based on search and tab
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase()
    if (activeTab === 'hadir') {
      return absensiList.filter(item => item.anggota.nama_lengkap.toLowerCase().includes(q))
    } else {
      return missingMembers.filter(m => m.nama_lengkap.toLowerCase().includes(q))
    }
  }, [searchQuery, activeTab, absensiList, missingMembers])


  return (
    <div className="space-y-6 pb-20 relative">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-pink-400" />
            <span>Jadwal Pertemuan</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Total {pertemuanList.length} pertemuan terdaftar dalam sistem
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-pink-900/40 transition-all hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Pertemuan</span>
        </button>
      </div>

      {/* Pertemuan Cards Grid */}
      <div className="relative z-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-pink-300">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="text-sm font-medium">Memuat jadwal pertemuan...</p>
          </div>
        ) : pertemuanList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-800/30 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
            <CalendarDays className="w-16 h-16 mb-4 text-slate-600" />
            <p className="text-base font-medium">Belum ada jadwal pertemuan.</p>
            <p className="text-sm mt-1 text-slate-500">Klik tombol Tambah Pertemuan untuk membuat jadwal baru.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {pertemuanList.map((item) => (
              <div 
                key={item.id} 
                onClick={() => openDetail(item)}
                className="group relative bg-slate-800/60 backdrop-blur-md border border-slate-700 hover:border-pink-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(244,63,94,0.15)] cursor-pointer flex flex-col h-full"
              >
                {/* Card Header */}
                <div className="px-5 py-4 border-b border-slate-700/50 flex justify-between items-start bg-slate-800/80">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-pink-500/10 text-pink-400 font-bold text-xs mb-2 border border-pink-500/20">
                      P{item.pertemuan_ke}
                    </div>
                    <h3 className="font-bold text-base text-white line-clamp-1 group-hover:text-pink-300 transition-colors">
                      {item.nama_pertemuan}
                    </h3>
                  </div>
                  
                  <div className="flex flex-col gap-2 items-end">
                    <button
                        onClick={(e) => handleToggleManual(e, item)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                        item.manual_active
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                            : 'bg-slate-900/80 text-slate-400 border border-slate-700 hover:bg-slate-700'
                        }`}
                        title="Toggle Manual Aktif"
                    >
                        <div className={`w-1.5 h-1.5 rounded-full ${item.manual_active ? 'bg-pink-400 animate-pulse' : 'bg-slate-500'}`}></div>
                        {item.manual_active ? 'MANUAL ON' : 'MANUAL OFF'}
                    </button>
                    
                    {item.is_libur && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        LIBUR
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-slate-300 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0 text-slate-400">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <span>{formatDateIndo(item.tanggal)}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-slate-300 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0 text-slate-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span>{formatTime(item.jam_mulai_scan)} - {formatTime(item.jam_akhir_scan)} WIB</span>
                  </div>

                  {item.keterangan && (
                    <div className="mt-2 text-xs text-slate-400 bg-slate-900/50 p-3 rounded-xl border border-slate-700/30 line-clamp-2">
                      {item.keterangan}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-5 py-4 border-t border-slate-700/50 bg-slate-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <div className="w-7 h-7 rounded-full bg-pink-500/20 border-2 border-slate-800 flex items-center justify-center z-20">
                        <UserCheck className="w-3.5 h-3.5 text-pink-400" />
                      </div>
                      <div className="w-7 h-7 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center z-10 text-[10px] font-bold text-slate-300">
                        +{item.absensi_count || 0}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-400 ml-1">Hadir</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => openEditModal(e, item)}
                      title="Edit"
                      className="p-2 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      title="Hapus"
                      className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-700 mx-1"></div>
                    <Link
                      to={`/rekap?pertemuan_id=${item.id}`}
                      onClick={(e) => e.stopPropagation()}
                      title="Lihat Excel Rekap"
                      className="p-2 hover:bg-pink-500/20 text-pink-400 rounded-lg transition"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal / Slide-out */}
      {isDetailOpen && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 sm:rounded-2xl w-full max-w-3xl sm:h-[85vh] h-[95vh] shadow-2xl flex flex-col animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300 rounded-t-2xl overflow-hidden relative">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-start bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="px-2.5 py-1 rounded-md bg-pink-500/20 text-pink-400 font-bold text-xs border border-pink-500/30">
                    Pertemuan {selectedMeeting.pertemuan_ke}
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedMeeting.nama_pertemuan}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 mt-2">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {formatDateIndo(selectedMeeting.tanggal)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(selectedMeeting.jam_mulai_scan)} - {formatTime(selectedMeeting.jam_akhir_scan)}
                  </div>
                  {selectedMeeting.is_libur && (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Libur
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => openEditModal(e, selectedMeeting)}
                  className="p-2 text-slate-400 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-colors"
                  title="Edit Pertemuan"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsDetailOpen(false)} 
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-900/50">
              {detailLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-pink-300 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm">Memuat detail absensi...</p>
                </div>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4 p-6 bg-slate-800/20 border-b border-slate-800/50">
                    <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-pink-400">{absensiList.length}</div>
                        <div className="text-xs text-pink-300 uppercase tracking-wider font-semibold">Anggota Hadir</div>
                      </div>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                        <UserX className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-rose-400">{missingMembers.length}</div>
                        <div className="text-xs text-rose-300 uppercase tracking-wider font-semibold">Tidak Hadir</div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs & Search */}
                  <div className="px-6 py-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-800">
                    <div className="flex bg-slate-800/50 p-1 rounded-lg w-full sm:w-auto">
                      <button
                        onClick={() => setActiveTab('hadir')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-semibold transition-all ${
                          activeTab === 'hadir' 
                            ? 'bg-slate-700 text-white shadow-sm' 
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                        }`}
                      >
                        Hadir ({absensiList.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('tidak_hadir')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-semibold transition-all ${
                          activeTab === 'tidak_hadir' 
                            ? 'bg-slate-700 text-white shadow-sm' 
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                        }`}
                      >
                        Tidak Hadir ({missingMembers.length})
                      </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-500" />
                      </div>
                      <input
                        type="text"
                        placeholder="Cari anggota..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-xl leading-5 bg-slate-800/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 sm:text-sm transition-colors"
                      />
                    </div>
                  </div>

                  {/* List View */}
                  <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {filteredList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                        <Users className="w-12 h-12 mb-3 text-slate-600" />
                        <p>Tidak ada anggota yang ditemukan.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activeTab === 'hadir' ? (
                          (filteredList as AbsensiRecord[]).map((item) => (
                            <div key={item.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex items-center gap-4 hover:bg-slate-800/80 transition-colors">
                              <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-sm shrink-0 border border-pink-500/30">
                                {item.anggota.nama_lengkap.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-slate-200 truncate">{item.anggota.nama_lengkap}</h4>
                                <div className="text-[11px] text-slate-400 mt-0.5 truncate flex items-center gap-2">
                                  <span>{item.anggota.kelas} {item.anggota.jurusan}</span>
                                  {item.anggota.jabatan !== 'Anggota' && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[9px] font-semibold">
                                      {item.anggota.jabatan}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-mono text-pink-400 bg-pink-500/10 px-2 py-1 rounded">
                                  {formatTime(item.scan_time)}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          (filteredList as Anggota[]).map((anggota) => (
                            <div key={anggota.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex items-center gap-4 hover:bg-slate-800/80 transition-colors opacity-80 hover:opacity-100">
                              <div className="w-10 h-10 rounded-full bg-slate-700 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">
                                {anggota.nama_lengkap.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-slate-300 truncate">{anggota.nama_lengkap}</h4>
                                <div className="text-[11px] text-slate-500 mt-0.5 truncate flex items-center gap-2">
                                  <span>{anggota.kelas} {anggota.jurusan}</span>
                                  {anggota.jabatan !== 'Anggota' && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-[9px] font-semibold">
                                      {anggota.jabatan}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-medium text-rose-300 uppercase tracking-wider flex items-center gap-1">
                                  <UserX className="w-3 h-3" /> Absent
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Modal Add / Edit Pertemuan (Form) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm animate-in fade-in sm:items-center sm:p-4">
          <div className="relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
            {/* Top gradient glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-pink-500"></div>

            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {isEditing ? <Edit2 className="w-5 h-5 text-pink-400" /> : <Plus className="w-5 h-5 text-pink-400" />}
                {isEditing ? 'Edit Jadwal Pertemuan' : 'Tambah Pertemuan Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4 text-sm">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Nama Pertemuan *</label>
                <input
                  type="text"
                  value={formData.nama_pertemuan}
                  onChange={(e) => setFormData({ ...formData, nama_pertemuan: e.target.value })}
                  placeholder="Contoh: Pertemuan Ke-1"
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all placeholder:text-slate-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Pertemuan Ke *</label>
                  <input
                    type="number"
                    value={formData.pertemuan_ke}
                    onChange={(e) => setFormData({ ...formData, pertemuan_ke: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Tanggal *</label>
                  <input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Mulai Scan *</label>
                  <input
                    type="time"
                    value={formData.jam_mulai_scan}
                    onChange={(e) => setFormData({ ...formData, jam_mulai_scan: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Akhir Scan *</label>
                  <input
                    type="time"
                    value={formData.jam_akhir_scan}
                    onChange={(e) => setFormData({ ...formData, jam_akhir_scan: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Keterangan / Materi</label>
                <textarea
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Contoh: Pengenalan Huruf Hiragana & Katakana"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all resize-none placeholder:text-slate-600"
                />
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-slate-800/50 rounded-lg transition-colors border border-transparent hover:border-slate-700/50">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.manual_active}
                      onChange={(e) => setFormData({ ...formData, manual_active: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-pink-500 focus:ring-pink-500/30 focus:ring-offset-slate-900 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="text-slate-200 font-medium text-sm group-hover:text-pink-400 transition-colors">Aktifkan Manual Sekarang</div>
                    <div className="text-slate-500 text-xs">Abaikan jam otomatis, absensi langsung dibuka</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-slate-800/50 rounded-lg transition-colors border border-transparent hover:border-slate-700/50">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_libur}
                      onChange={(e) => setFormData({ ...formData, is_libur: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-rose-500 focus:ring-rose-500/30 focus:ring-offset-slate-900 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="text-slate-200 font-medium text-sm group-hover:text-rose-400 transition-colors">Tandai Libur</div>
                    <div className="text-slate-500 text-xs">Pertemuan ditiadakan (libur)</div>
                  </div>
                </label>
              </div>

              {saveError && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="sticky bottom-0 -mx-4 -mb-4 flex justify-end gap-3 border-t border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-pink-600 hover:from-pink-500 hover:to-pink-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-pink-900/30 transition-all hover:-translate-y-0.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Simpan Jadwal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
