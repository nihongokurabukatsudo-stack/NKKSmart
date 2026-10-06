import React, { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { CalendarRange, Download, FileSpreadsheet, FileText, Loader2, Printer, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PrintSheet, PrintTips } from '../components/print/PrintSheet'
import { printWhenReady } from '../lib/print'

type AttendanceStatus = 'hadir' | 'tidak_hadir'
interface SemesterMeeting { id: string; nama_pertemuan: string; pertemuan_ke: number; tanggal: string; is_libur: boolean }
interface SemesterMember { id: string; nama_lengkap: string; kelas: string; jurusan: string; nis: string | null; jabatan: string; attendance: Record<string, AttendanceStatus> }
interface SemesterReport { meetings: SemesterMeeting[]; members: SemesterMember[] }

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const STATUS_LETTER: Record<AttendanceStatus, string> = { hadir: 'H', tidak_hadir: 'T' }
const getJakartaToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = (name: string) => parts.find((item) => item.type === name)?.value || '01'
  return `${part('year')}-${part('month')}-${part('day')}`
}
const currentPeriod = () => {
  const today = getJakartaToday()
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  return month >= 7 ? { year, semester: 1 } : { year: year - 1, semester: 2 }
}
const monthOf = (date: string) => Number(date.slice(5, 7)) - 1
const dateLabel = (date: string) => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00+07:00`))

export const RekapSemesterPage: React.FC = () => {
  const period = useMemo(currentPeriod, [])
  const today = useMemo(getJakartaToday, [])
  const [year, setYear] = useState(period.year)
  const [semester, setSemester] = useState<1 | 2>(period.semester as 1 | 2)
  const [kelas, setKelas] = useState('all')
  const [jabatan, setJabatan] = useState('all')
  const [includeFuture, setIncludeFuture] = useState(false)
  const [search, setSearch] = useState('')
  const [report, setReport] = useState<SemesterReport>({ meetings: [], members: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isPrinting, setIsPrinting] = useState(false)
  const [advisor, setAdvisor] = useState(() => localStorage.getItem('nkk-semester-advisor') || '')
  const [chair, setChair] = useState(() => localStorage.getItem('nkk-semester-chair') || '')

  useEffect(() => { localStorage.setItem('nkk-semester-advisor', advisor) }, [advisor])
  useEffect(() => { localStorage.setItem('nkk-semester-chair', chair) }, [chair])

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      const { data, error: rpcError } = await (supabase.rpc as any)('rekap_semester', { p_tahun: year, p_semester: semester })
      if (!active) return
      if (rpcError) {
        setReport({ meetings: [], members: [] })
        setError(`Gagal memuat rekap semester. Terapkan migration RPC terlebih dahulu. ${rpcError.message}`)
      } else if (data) {
        setReport(data as SemesterReport)
      } else {
        setReport({ meetings: [], members: [] })
      }
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [year, semester])

  const meetings = useMemo(() => report.meetings.filter((meeting) => includeFuture || meeting.tanggal <= today), [report.meetings, includeFuture, today])
  const filteredMembers = useMemo(() => report.members.filter((member) => {
    if (kelas !== 'all' && member.kelas !== kelas) return false
    if (jabatan !== 'all' && member.jabatan !== jabatan) return false
    if (search.trim()) {
      const q = search.trim().toLocaleLowerCase('id-ID')
      return `${member.nama_lengkap} ${member.nis || ''} ${member.jurusan}`.toLocaleLowerCase('id-ID').includes(q)
    }
    return true
  }).sort((a, b) => Number(b.jabatan === 'Pengurus') - Number(a.jabatan === 'Pengurus') || a.kelas.localeCompare(b.kelas, 'id') || a.nama_lengkap.localeCompare(b.nama_lengkap, 'id')), [report.members, kelas, jabatan, search])
  const sessions = meetings.filter((meeting) => !meeting.is_libur)
  const presentCount = filteredMembers.reduce((sum, member) => sum + sessions.filter((meeting) => member.attendance[String(meeting.id)] === 'hadir').length, 0)
  const possibleCount = filteredMembers.length * sessions.length
  const averageRate = possibleCount ? Math.round((presentCount * 100) / possibleCount) : 0
  const meetingMonths = useMemo(() => {
    const map = new Map<number, SemesterMeeting[]>()
    meetings.forEach((meeting) => {
      const month = monthOf(meeting.tanggal)
      map.set(month, [...(map.get(month) || []), meeting])
    })
    return [...map.entries()].sort(([a], [b]) => a - b)
  }, [meetings])
  const classes = useMemo(() => [...new Set(report.members.map((member) => member.kelas).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id')), [report.members])
  const groups = useMemo(() => {
    const map = new Map<string, SemesterMember[]>()
    filteredMembers.forEach((member) => {
      const key = `${member.jabatan}|${member.kelas || 'Tanpa kelas'}`
      map.set(key, [...(map.get(key) || []), member])
    })
    return [...map.entries()]
  }, [filteredMembers])

  const rateFor = (member: SemesterMember) => {
    const count = sessions.filter((meeting) => member.attendance[String(meeting.id)] === 'hadir').length
    return { count, rate: sessions.length ? Math.round((count * 100) / sessions.length) : 0 }
  }
  const valueFor = (member: SemesterMember, meeting: SemesterMeeting) => meeting.is_libur ? 'Libur' : STATUS_LETTER[member.attendance[String(meeting.id)]] || '-'
  const exportRows = () => {
    const headers = ['No', 'Jabatan', 'Nama', 'Kelas', 'Jurusan', 'NIS', ...meetings.map((meeting) => `P${meeting.pertemuan_ke} ${dateLabel(meeting.tanggal)}`), 'Hadir', 'Jumlah Pertemuan', 'Persentase']
    const rows = filteredMembers.map((member, index) => {
      const totals = rateFor(member)
      return [index + 1, member.jabatan, member.nama_lengkap, member.kelas, member.jurusan, member.nis || '', ...meetings.map((meeting) => valueFor(member, meeting)), totals.count, sessions.length, `${totals.rate}%`]
    })
    return { headers, rows }
  }
  const downloadCsv = async () => {
    const { headers, rows } = exportRows()
    const blob = new Blob(['\ufeff', Papa.unparse([headers, ...rows])], { type: 'text/csv;charset=utf-8' })
    const { saveAs } = await import('file-saver')
    saveAs(blob, `Rekap_Semester${semester}_${year}.csv`)
  }
  const downloadExcel = async () => {
    const XLSX = await import('xlsx')
    const { headers, rows } = exportRows()
    const sheet = XLSX.utils.aoa_to_sheet([[`Rekap Absensi Semester ${semester} Tahun Ajaran ${year}/${year + 1}`], headers, ...rows])
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Rekap Semester')
    XLSX.writeFile(book, `Rekap_Semester${semester}_${year}.xlsx`)
  }
  const downloadWord = async () => {
    const { AlignmentType, BorderStyle, Document, PageOrientation, Packer, Paragraph, Table: WordTable, TableCell, TableRow, TextRun, WidthType } = await import('docx')
    const { saveAs } = await import('file-saver')
    const { headers, rows } = exportRows()
    const widths = headers.map(() => Math.floor(15600 / headers.length))
    const makeCells = (values: (string | number)[], isHeader = false) => values.map((value, index) => new TableCell({
      width: { size: widths[index], type: WidthType.DXA },
      shading: isHeader ? { fill: 'FCE7F3', type: 'clear' } : undefined,
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(value), bold: isHeader, size: 14 })] })],
    }))
    const table = new WordTable({
      width: { size: 15600, type: WidthType.DXA },
      columnWidths: widths,
      rows: [new TableRow({ tableHeader: true, children: makeCells(headers, true) }), ...rows.map((row) => new TableRow({ children: makeCells(row) }))],
      borders: { insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: '999999' }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: '999999' }, top: { style: BorderStyle.SINGLE, size: 2, color: '999999' }, bottom: { style: BorderStyle.SINGLE, size: 2, color: '999999' }, left: { style: BorderStyle.SINGLE, size: 2, color: '999999' }, right: { style: BorderStyle.SINGLE, size: 2, color: '999999' } },
    })
    const doc = new Document({ sections: [{ properties: { page: { size: { width: 16838, height: 11906, orientation: PageOrientation.LANDSCAPE }, margin: { top: 567, right: 567, bottom: 567, left: 567 } } }, children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Rekap Absensi Semester ${semester} Tahun Ajaran ${year}/${year + 1}`, bold: true, size: 26 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NKK Bahasa Jepang', size: 18 })] }),
      table,
    ] }] })
    saveAs(await Packer.toBlob(doc), `Rekap_Semester${semester}_${year}.docx`)
  }
  const handlePrint = async () => {
    setIsPrinting(true)
    try { await printWhenReady() } finally { setIsPrinting(false) }
  }

  const schoolYear = semester === 1 ? `${year}/${year + 1}` : `${year}/${year + 1}`
  const title = `Rekap Absensi Semester ${semester} Tahun Ajaran ${schoolYear}`
  const classesSummary = classes.map((className) => {
    const members = filteredMembers.filter((member) => member.kelas === className)
    const count = members.reduce((sum, member) => sum + rateFor(member).count, 0)
    const denominator = members.length * sessions.length
    return { className, count, rate: denominator ? Math.round(count * 100 / denominator) : 0, memberCount: members.length }
  }).filter((entry) => entry.memberCount)

  return (
    <div className="space-y-5 pb-8">
      <div className="no-print flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h1 className="flex items-center gap-2 text-xl font-bold text-white"><CalendarRange className="h-6 w-6 text-pink-400"/>Rekap Semester</h1><p className="mt-1 text-xs text-slate-400">Matriks kehadiran anggota aktif per semester.</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void handlePrint()} disabled={loading || isPrinting} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-pink-600 px-4 text-sm font-semibold text-white disabled:opacity-50"><Printer size={16}/>{isPrinting ? 'Menyiapkan…' : 'Cetak/PDF'}</button>
          <button onClick={downloadExcel} disabled={loading || !filteredMembers.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 text-sm text-white disabled:opacity-50"><FileSpreadsheet size={16}/>Excel</button>
          <button onClick={downloadCsv} disabled={loading || !filteredMembers.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 text-sm text-white disabled:opacity-50"><Download size={16}/>CSV</button>
          <button onClick={() => void downloadWord()} disabled={loading || !filteredMembers.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 text-sm text-white disabled:opacity-50"><FileText size={16}/>Word</button>
        </div>
      </div>

      <div className="no-print grid gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 sm:grid-cols-2 xl:grid-cols-6">
        <label className="flex flex-col gap-1 text-xs text-slate-300">Tahun ajaran mulai<select className="min-h-11 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-white" value={year} onChange={(event) => setYear(Number(event.target.value))}>{Array.from({ length: 8 }, (_, index) => period.year + 1 - index).map((item) => <option key={item} value={item}>{item}/{item + 1}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">Semester<select className="min-h-11 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-white" value={semester} onChange={(event) => setSemester(Number(event.target.value) as 1 | 2)}><option value={1}>Semester 1 · Juli–Desember</option><option value={2}>Semester 2 · Januari–Juni</option></select></label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">Kelas<select className="min-h-11 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-white" value={kelas} onChange={(event) => setKelas(event.target.value)}><option value="all">Semua kelas</option>{classes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">Jabatan<select className="min-h-11 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-white" value={jabatan} onChange={(event) => setJabatan(event.target.value)}><option value="all">Semua</option><option value="Pengurus">Pengurus</option><option value="Anggota">Anggota</option></select></label>
        <label className="flex min-h-11 items-center gap-2 self-end text-xs text-slate-200"><input type="checkbox" checked={includeFuture} onChange={(event) => setIncludeFuture(event.target.checked)} className="accent-pink-500"/>Sertakan pertemuan yang belum berlangsung</label>
        <label className="relative flex min-h-11 items-center self-end"><Search size={16} className="absolute left-3 text-slate-500"/><input className="h-11 w-full rounded-lg border border-slate-600 bg-slate-950 pl-9 pr-3 text-sm text-white" placeholder="Cari nama/NIS" value={search} onChange={(event) => setSearch(event.target.value)}/></label>
      </div>

      {error && <p role="alert" className="no-print rounded-xl border border-rose-500/30 bg-rose-950/50 p-4 text-sm text-rose-200">{error}</p>}
      {loading ? <div className="no-print flex items-center gap-3 p-12 text-slate-300"><Loader2 className="animate-spin text-pink-400"/>Memuat rekap semester…</div> : !error && (
        <>
          <PrintSheet orientation="landscape" className="semester-report">
            <header className="print-color mb-4 flex items-center justify-center gap-4 border-b-2 border-rose-800 pb-3">
              <img src="/img/nkk.png" alt="Logo NKK" width={96} height={96} className="h-[17mm] w-[17mm] object-contain"/>
              <div className="text-center"><p className="text-xs font-bold uppercase tracking-widest text-rose-800">NKK Bahasa Jepang</p><h2 className="mt-1 text-lg font-extrabold">{title}</h2><p className="mt-1 text-xs">Dicetak {dateLabel(today)}</p></div>
            </header>

            <section className="mb-4 grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-4">
              <div className="rounded-lg border border-slate-300 bg-pink-50 p-2"><b>Total Anggota</b><div>{filteredMembers.length}</div></div>
              <div className="rounded-lg border border-slate-300 bg-pink-50 p-2"><b>Pertemuan</b><div>{sessions.length} sesi · {meetings.filter((meeting) => meeting.is_libur).length} libur</div></div>
              <div className="rounded-lg border border-slate-300 bg-pink-50 p-2"><b>Rata-rata Hadir</b><div>{averageRate}%</div></div>
              <div className="rounded-lg border border-slate-300 bg-pink-50 p-2"><b>Total Hadir</b><div>{presentCount}/{possibleCount}</div></div>
            </section>

            <div className="mb-4 grid gap-2 text-[8pt] sm:grid-cols-2">
              <div className="rounded-lg border border-slate-300 p-2"><b>Rata-rata per bulan</b><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{meetingMonths.map(([month, monthMeetings]) => {
                const monthSessions = monthMeetings.filter((meeting) => !meeting.is_libur)
                const count = filteredMembers.reduce((sum, member) => sum + monthSessions.filter((meeting) => member.attendance[String(meeting.id)] === 'hadir').length, 0)
                const denominator = monthSessions.length * filteredMembers.length
                return <span key={month}>{MONTH_NAMES[month]}: {denominator ? Math.round(count * 100 / denominator) : 0}%</span>
              })}</div></div>
              <div className="rounded-lg border border-slate-300 p-2"><b>Rata-rata per kelas</b><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{classesSummary.map((item) => <span key={item.className}>{item.className}: {item.rate}%</span>)}</div></div>
            </div>

            {loading && <p className="mb-3 text-sm">Memuat data…</p>}
            {meetingMonths.length === 0 ? <p className="rounded-lg border border-dashed border-slate-400 p-6 text-center text-sm">Tidak ada pertemuan pada semester ini.</p> : meetingMonths.map(([month, monthMeetings], monthIndex) => {
              const meetingWidth = Math.max(7, Math.min(12, Math.floor(175 / Math.max(monthMeetings.length, 1))) )
              return <section key={month} className={`semester-month-block mb-4 ${monthIndex > 0 ? 'print-new-page' : ''}`}>
                <h3 className="print-group-heading mb-2 rounded-t-lg border border-slate-400 bg-pink-100 px-2 py-1 text-sm font-bold">{MONTH_NAMES[month]} {monthMeetings[0].tanggal.slice(0, 4)}</h3>
                <div className="overflow-x-auto"><table className="semester-matrix w-full table-fixed border-collapse text-[7pt]">
                  <colgroup><col style={{ width: '8mm' }}/><col style={{ width: '48mm' }}/><col style={{ width: '20mm' }}/>{monthMeetings.map((meeting) => <col key={meeting.id} style={{ width: `${meetingWidth}mm` }}/ >)}<col style={{ width: '14mm' }}/><col style={{ width: '14mm' }}/><col style={{ width: '14mm' }}/></colgroup>
                  <thead><tr className="bg-pink-100 text-center"><th className="border border-slate-500 px-1 py-1">No</th><th className="border border-slate-500 px-1 py-1 text-left">Nama Anggota</th><th className="border border-slate-500 px-1 py-1">Kelas</th>{monthMeetings.map((meeting) => <th key={meeting.id} className={`border border-slate-500 px-1 py-1 ${meeting.is_libur ? 'holiday-column' : ''}`}><span className="block font-bold">P{meeting.pertemuan_ke}</span><span className="block">{dateLabel(meeting.tanggal).replace(/ \d{4}$/, '')}</span>{meeting.is_libur && <span className="block font-bold">Libur</span>}</th>)}<th className="border border-slate-500 px-1 py-1">Hadir</th><th className="border border-slate-500 px-1 py-1">Sesi</th><th className="border border-slate-500 px-1 py-1">%</th></tr></thead>
                  <tbody>{groups.flatMap(([groupName, members]) => {
                    const [role, className] = groupName.split('|')
                    return [<tr key={`group-${month}-${groupName}`} className="semester-group-row"><th colSpan={monthMeetings.length + 6} className="border border-slate-500 bg-slate-200 px-2 py-1 text-left font-bold">{role} · Kelas {className}</th></tr>, ...members.map((member, memberIndex) => {
                      const totals = rateFor(member)
                      const memberNumber = filteredMembers.findIndex((item) => item.id === member.id) + 1
                      return <tr key={`${month}-${member.id}`} className="semester-data-row"><td className="border border-slate-400 px-1 py-1 text-center">{memberNumber}</td><td className="border border-slate-400 px-1 py-1">{member.nama_lengkap}{member.nis && <small className="block text-slate-600">NIS {member.nis}</small>}</td><td className="border border-slate-400 px-1 py-1 text-center">{member.kelas}</td>{monthMeetings.map((meeting) => <td key={meeting.id} className={`border border-slate-400 px-1 py-1 text-center font-bold ${meeting.is_libur ? 'holiday-column' : ''}`}>{valueFor(member, meeting)}</td>)}<td className="border border-slate-400 px-1 py-1 text-center font-bold">{totals.count}</td><td className="border border-slate-400 px-1 py-1 text-center">{sessions.length}</td><td className="border border-slate-400 px-1 py-1 text-center font-bold">{totals.rate}%</td></tr>
                    })]
                  })}</tbody>
                </table></div>
              </section>
            })}

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-400 pt-2 text-[8pt]"><b>Legenda:</b><span>H Hadir</span><span>T Tidak hadir</span><span>- Belum ada data</span><span>Libur tidak dihitung</span></div>
            <footer className="mt-8 grid grid-cols-2 gap-10 text-center text-xs">
              <div><p>Mengetahui,</p><p>Pembina Ekstrakurikuler</p><div className="h-16"/><label className="no-print mx-auto block max-w-64 text-left">Nama Pembina<input value={advisor} onChange={(event) => setAdvisor(event.target.value)} className="mt-1 min-h-10 w-full rounded border border-slate-400 px-2"/></label><p className="print-only font-bold underline">{advisor || ' '}</p></div>
              <div><p>Ketua NKK</p><div className="h-[5.25rem]"/><label className="no-print mx-auto block max-w-64 text-left">Nama Ketua<input value={chair} onChange={(event) => setChair(event.target.value)} className="mt-1 min-h-10 w-full rounded border border-slate-400 px-2"/></label><p className="print-only font-bold underline">{chair || ' '}</p></div>
            </footer>
          </PrintSheet>
          <PrintTips />
        </>
      )}
    </div>
  )
}
