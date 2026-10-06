import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { MemberCard } from '../components/cards/MemberCard'
import { PrintTips } from '../components/print/PrintSheet'
import { printWhenReady } from '../lib/print'
import {
  CreditCard,
  Printer,
  Search,
  Filter,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
  Scissors,
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
  const [printIdsOverride, setPrintIdsOverride] = useState<number[] | null>(null)
  const [singleCardPages, setSingleCardPages] = useState(false)
  const [cropMarks, setCropMarks] = useState(false)
  const [cutLines, setCutLines] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [printError, setPrintError] = useState('')

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
    const visibleIds = filteredMembers.map((member) => member.id)
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
    const next = new Set(selectedIds)
    visibleIds.forEach((id) => allVisibleSelected ? next.delete(id) : next.add(id))
    setSelectedIds(next)
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

  const printMembers = printIdsOverride === null
    ? filteredMembers
    : filteredMembers.filter((member) => printIdsOverride.includes(member.id))

  const startPrint = async (ids: number[], oneCardPerPage = singleCardPages) => {
    if (!ids.length) return
    setPrintError('')
    setPrintIdsOverride(ids)
    setSingleCardPages(oneCardPerPage)
    setIsPrinting(true)
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    try {
      await printWhenReady()
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : 'Kartu belum siap dicetak.')
    } finally {
      setIsPrinting(false)
      setPrintIdsOverride(null)
    }
  }

  useEffect(() => {
    const clearPrintOverride = () => {
      setPrintIdsOverride(null)
      setIsPrinting(false)
    }
    window.addEventListener('afterprint', clearPrintOverride)
    return () => window.removeEventListener('afterprint', clearPrintOverride)
  }, [])

  const pageSize = singleCardPages ? 1 : 9
  const cardPages = Array.from({ length: Math.ceil(printMembers.length / pageSize) }, (_, index) => printMembers.slice(index * pageSize, (index + 1) * pageSize))
  const filteredSelectedCount = filteredMembers.filter((member) => selectedIds.has(member.id)).length
  const allFilteredSelected = filteredMembers.length > 0 && filteredMembers.every((member) => selectedIds.has(member.id))
  const countForPrint = filteredSelectedCount || filteredMembers.length

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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleSelectAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            {allFilteredSelected ? (
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
            onClick={() => void startPrint(filteredMembers.filter((member) => selectedIds.has(member.id)).map((member) => member.id))}
            disabled={filteredSelectedCount === 0 || isPrinting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-pink-900/30 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{isPrinting ? 'Menyiapkan…' : `Cetak Terpilih (${filteredSelectedCount})`}</span>
          </button>
          <button type="button" disabled={isPrinting} onClick={() => void startPrint(filteredMembers.map((member) => member.id))} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-4 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-50"><Printer className="h-4 w-4"/>Cetak Semua</button>
          <button type="button" disabled={isPrinting || filteredMembers.length === 0} onClick={() => { const first = filteredMembers.find((member) => selectedIds.has(member.id)) || filteredMembers[0]; void startPrint([first.id], true) }} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-4 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-50"><Printer className="h-4 w-4"/>Cetak 1 Kartu</button>
        </div>
      </div>

      <div className="no-print flex flex-wrap items-center gap-4 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-200">
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={singleCardPages} onChange={(event) => setSingleCardPages(event.target.checked)} className="accent-pink-500"/>Satu kartu per halaman</label>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={cropMarks} onChange={(event) => setCropMarks(event.target.checked)} className="accent-pink-500"/><Scissors className="h-4 w-4"/>Tanda potong</label>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={cutLines} onChange={(event) => setCutLines(event.target.checked)} className="accent-pink-500"/>Garis potong 0,2 mm</label>
        <span className="ml-auto">{countForPrint} kartu · {singleCardPages ? countForPrint : Math.ceil(countForPrint / 9)} halaman A4</span>
      </div>
      <PrintTips card />
      {printError && <p role="alert" className="no-print rounded-xl border border-rose-500/30 bg-rose-950/50 p-3 text-sm text-rose-200">{printError}</p>}

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

      {/* A4 card sheets */}
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
        <div className={`print-area card-print-area ${cropMarks ? 'crop-marks' : ''} ${cutLines ? 'cut-lines' : ''} ${singleCardPages ? 'single-card-pages' : ''}`}>
          {cardPages.map((page, pageIndex) => (
            <section key={pageIndex} className={`card-print-page ${pageIndex === cardPages.length - 1 ? 'is-last' : ''}`} aria-label={`Halaman kartu ${pageIndex + 1}`}>
              {page.map((item) => (
                <div key={item.id} className="card-crop-wrap">
                  <div className="no-print flex min-h-11 items-center gap-2 px-2 text-xs text-slate-200">
                    <input aria-label={`Pilih kartu ${item.nama_lengkap}`} type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelectOne(item.id)} className="accent-pink-500" />
                    <span>Pilih {item.kode_unik}</span>
                  </div>
                  <MemberCard id={item.id} nama={item.nama_lengkap} kelas={item.kelas} jurusan={item.jurusan} nis={item.nis} kodeUnik={item.kode_unik} qrValue={item.qr_value} jabatan={item.jabatan} showActions />
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
