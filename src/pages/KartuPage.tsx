import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { MemberCard } from '../components/cards/MemberCard'
import {
  CreditCard,
  Printer,
  Search,
  Filter,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
} from 'lucide-react'

interface AnggotaCardData {
  id: number
  nama_lengkap: string
  kelas: string
  jurusan: string
  nis: string | null
  jabatan: string
  kode_unik: string
  qr_value: string
}

export const KartuPage: React.FC = () => {
  const [members, setMembers] = useState<AnggotaCardData[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterKelas, setFilterKelas] = useState<string>('all')
  const [filterJabatan, setFilterJabatan] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const fetchMembers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('anggota')
        .select(`
          id,
          nama_lengkap,
          kelas,
          jurusan,
          nis,
          jabatan,
          kode_qr,
          barcode:barcode (
            kode_unik,
            qr_value
          )
        `)
        .eq('is_deleted', false)
        .eq('status', 'Aktif')
        .order('kelas', { ascending: true })
        .order('nama_lengkap', { ascending: true })

      if (!error && data) {
        const formatted: AnggotaCardData[] = data.map((item: any) => {
          const bc = Array.isArray(item.barcode) ? item.barcode[0] : item.barcode
          const kode = bc?.kode_unik || item.kode_qr || 'NKKP-0000'
          return {
            id: item.id,
            nama_lengkap: item.nama_lengkap,
            kelas: item.kelas,
            jurusan: item.jurusan,
            nis: item.nis,
            jabatan: item.jabatan,
            kode_unik: kode,
            qr_value: bc?.qr_value || `NKKSMART|MEMBER|${kode}`,
          }
        })
        setMembers(formatted)
      }
    } catch (err) {
      console.error('Error fetching cards:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (filterKelas !== 'all' && m.kelas !== filterKelas) return false
      if (filterJabatan !== 'all' && m.jabatan !== filterJabatan) return false
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        return (
          m.nama_lengkap.toLowerCase().includes(q) ||
          m.kode_unik.toLowerCase().includes(q) ||
          (m.nis || '').includes(q) ||
          m.jurusan.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [members, filterKelas, filterJabatan, searchTerm])

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMembers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredMembers.map((m) => m.id)))
    }
  }

  const toggleSelectOne = (id: number) => {
    const updated = new Set(selectedIds)
    if (updated.has(id)) {
      updated.delete(id)
    } else {
      updated.add(id)
    }
    setSelectedIds(updated)
  }

  const handlePrintSelected = () => {
    window.print()
  }

  const membersToPrint = selectedIds.size > 0
    ? filteredMembers.filter((m) => selectedIds.has(m.id))
    : filteredMembers

  return (
    <div className="space-y-6">
      {/* Top Header - Hidden on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-pink-400" />
            <span>Cetak Kartu Absensi Anggota</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pilih satu, beberapa, atau cetak semua kartu sekaligus dengan format print standar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSelectAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            {selectedIds.size === filteredMembers.length && filteredMembers.length > 0 ? (
              <>
                <Square className="w-4 h-4" />
                <span>Batal Pilih Semua</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-4 h-4" />
                <span>Pilih Semua ({filteredMembers.length})</span>
              </>
            )}
          </button>
          <button
            onClick={handlePrintSelected}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-pink-900/30 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>
              Cetak {selectedIds.size > 0 ? `(${selectedIds.size} Terpilih)` : 'Semua'}
            </span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar - Hidden on Print */}
      <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-sm no-print">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama, NIS, jurusan, kode..."
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

      {/* Card Grid */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400 no-print">
          <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
          <p className="text-xs">Menyiapkan kartu anggota...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-16 text-center text-slate-400 no-print">
          <AlertCircle className="w-8 h-8 mx-auto text-slate-500 mb-2" />
          <p className="text-sm">Tidak ada kartu anggota yang cocok dengan filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 card-print-container">
          {membersToPrint.map((item) => {
            const isSelected = selectedIds.has(item.id)
            return (
              <div
                key={item.id}
                className="flex flex-col items-center p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 transition relative"
              >
                {/* Select Checkbox (No-Print) */}
                <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-700/40 no-print">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(item.id)}
                      className="rounded bg-slate-800 border-slate-700 text-pink-500 focus:ring-0"
                    />
                    <span>Pilih untuk dicetak</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">{item.kode_unik}</span>
                </div>

                {/* Member Card Component */}
                <MemberCard
                  id={item.id}
                  nama={item.nama_lengkap}
                  kelas={item.kelas}
                  jurusan={item.jurusan}
                  nis={item.nis}
                  kodeUnik={item.kode_unik}
                  qrValue={item.qr_value}
                  jabatan={item.jabatan}
                  showActions={true}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

