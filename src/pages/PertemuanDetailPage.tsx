import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clipboard, Save, Search, CalendarDays, Clock3 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDateIndo, formatTime } from '../lib/utils'

type Meeting = { id:number; nama_pertemuan:string; pertemuan_ke:number; tanggal:string; jam_mulai_scan:string; jam_akhir_scan:string; keterangan:string|null; is_libur:boolean; manual_active:boolean }
type Member = { id:number; nama_lengkap:string; kelas:string; jurusan:string; jabatan:string; nis:string|null }
type Attendance = { id:number; anggota_id:number; status:'hadir'|'izin'|'sakit'|'alpha'; scan_time:string|null; waktu_scan:string|null; catatan:string|null; barcode_id:number; anggota?:Member }

const statusNames = { hadir:'Hadir', izin:'Izin', sakit:'Sakit', alpha:'Alpha' }

export const PertemuanDetailPage: React.FC = () => {
  const { id } = useParams()
  const meetingId = Number(id)
  const [meeting,setMeeting] = useState<Meeting|null>(null)
  const [members,setMembers] = useState<Member[]>([])
  const [records,setRecords] = useState<Attendance[]>([])
  const [busy,setBusy] = useState(true)
  const [query,setQuery] = useState('')
  const [kelas,setKelas] = useState('')
  const [tab,setTab] = useState<'hadir'|'tidak'|'semua'>('semua')
  const [selected,setSelected] = useState<number[]>([])
  const [note,setNote] = useState('')
  const [message,setMessage] = useState('')

  const load = async () => {
    setBusy(true)
    const [m,a,att] = await Promise.all([
      supabase.from('pertemuan').select('*').eq('id',meetingId).single(),
      supabase.from('anggota').select('id,nama_lengkap,kelas,jurusan,jabatan,nis').eq('status','Aktif').eq('is_deleted',false).order('nama_lengkap'),
      supabase.from('absensi').select('id,anggota_id,status,scan_time,waktu_scan,catatan,barcode_id').eq('pertemuan_id',meetingId),
    ])
    if (m.data) { setMeeting(m.data as Meeting); setNote(m.data.keterangan || '') }
    if (a.data) setMembers(a.data as Member[])
    if (att.data) setRecords(att.data as Attendance[])
    if (m.error || a.error || att.error) setMessage(`Gagal memuat data: ${(m.error || a.error || att.error)?.message}`)
    setBusy(false)
  }
  useEffect(() => { if(Number.isFinite(meetingId)) void load() }, [meetingId])

  const rows = useMemo(() => members.map(member => ({ member, record:records.find(r=>r.anggota_id===member.id) })), [members,records])
  const present = rows.filter(r=>r.record?.status==='hadir')
  const absent = rows.filter(r=>r.record?.status!=='hadir')
  const filtered = rows.filter(({member,record})=>{
    const search=`${member.nama_lengkap} ${member.nis||''}`.toLowerCase().includes(query.toLowerCase())
    return search && (!kelas || member.kelas===kelas) && (tab==='semua' || (tab==='hadir'?record?.status==='hadir':record?.status!=='hadir'))
  })
  const rate = members.length ? Math.round(present.length*100/members.length) : 0
  const classStats = Object.entries(rows.reduce<Record<string,{total:number;hadir:number}>>((acc,{member,record})=>{const k=member.kelas||'Tanpa kelas';acc[k]??={total:0,hadir:0};acc[k].total++;if(record?.status==='hadir')acc[k].hadir++;return acc},{}))

  const saveNote = async () => {
    const {error}=await supabase.from('pertemuan').update({keterangan:note||null}).eq('id',meetingId)
    setMessage(error ? `Gagal menyimpan: ${error.message}` : 'Keterangan berhasil disimpan.')
  }
  const updateMember = async (member:Member, status:string, current?:Attendance, changes:Partial<Attendance>={}) => {
    if(status==='hapus') {
      if(!window.confirm(`Hapus data kehadiran ${member.nama_lengkap}?`)) return
      const {error}=await supabase.from('absensi').delete().eq('pertemuan_id',meetingId).eq('anggota_id',member.id)
      if(error) setMessage(error.message); else { setRecords(records.filter(r=>r.anggota_id!==member.id)); setMessage('Data kehadiran dihapus.') }
      return
    }
    const {data:barcode,error:barcodeError}=await supabase.from('barcode').select('id').eq('anggota_id',member.id).limit(1).maybeSingle()
    if(barcodeError||!barcode){setMessage(`Barcode ${member.nama_lengkap} tidak ditemukan.`);return}
    const now=new Date().toISOString()
    const payload={pertemuan_id:meetingId,anggota_id:member.id,barcode_id:barcode.id,status,scan_time:changes.scan_time??current?.scan_time??now,waktu_scan:changes.waktu_scan??current?.waktu_scan??now,catatan:changes.catatan??current?.catatan??null}
    const {data,error}=await supabase.from('absensi').upsert(payload,{onConflict:'pertemuan_id,anggota_id'}).select().single()
    if(error){setMessage(`Gagal mengubah status: ${error.message}`);return}
    setRecords([...records.filter(r=>r.anggota_id!==member.id),data as Attendance]);setMessage('Status kehadiran diperbarui.')
  }
  const setBulkStatus = async (status:'hadir'|'izin'|'sakit'|'alpha') => {
    const chosen=rows.filter(({member})=>selected.includes(member.id))
    for(const {member,record} of chosen) await updateMember(member,status,record)
    setSelected([])
    await load()
  }
  const markMissingAlpha = async () => {
    if(!window.confirm(`Tandai ${absent.filter(({record})=>!record).length} anggota yang belum memiliki data sebagai Alpha?`)) return
    for(const {member} of absent.filter(({record})=>!record)) await updateMember(member,'alpha')
    await load()
  }
  const summary = `Pertemuan ${meeting?.pertemuan_ke} • ${meeting?.tanggal ? formatDateIndo(meeting.tanggal):''} — Hadir ${present.length} dari ${members.length} (${rate}%)\n\nHADIR\n${present.map(({member})=>`${member.kelas} — ${member.nama_lengkap}`).join('\n')||'—'}\n\nTIDAK HADIR\n${absent.map(({member,record})=>`${member.kelas} — ${member.nama_lengkap}${record?.status?` (${statusNames[record.status]})`:''}`).join('\n')||'—'}`

  if(busy) return <div className="surface-card p-8">Memuat detail pertemuan…</div>
  if(!meeting) return <div className="surface-card p-8">Pertemuan tidak ditemukan. <Link className="text-rose-600" to="/pertemuan">Kembali</Link></div>
  return <div className="space-y-5 pb-8">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><Link to="/pertemuan" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-rose-600"><ArrowLeft size={17}/> Kembali ke pertemuan</Link><h1 className="mt-3 text-2xl font-bold">{meeting.nama_pertemuan} <span className="text-rose-600">· {meeting.pertemuan_ke}</span></h1><div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500"><span className="flex gap-2"><CalendarDays size={16}/>{formatDateIndo(meeting.tanggal)}</span><span className="flex gap-2"><Clock3 size={16}/>{formatTime(meeting.jam_mulai_scan)}–{formatTime(meeting.jam_akhir_scan)}</span><span>{meeting.is_libur?'Libur':meeting.manual_active?'Aktif manual':'Terjadwal'}</span></div></div><Link to="/pertemuan" className="rounded-xl border px-4 py-2 text-sm">Edit pertemuan</Link></div>
    {meeting.is_libur&&<div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-rose-100">Pertemuan ini berstatus libur. Pengeditan kehadiran dinonaktifkan.</div>}
    {message&&<div role="status" className="surface-card px-4 py-3 text-sm">{message}<button onClick={()=>setMessage('')} className="float-right">Tutup</button></div>}
    <div className="grid gap-3 sm:grid-cols-3"><div className="surface-card p-5"><p className="text-sm text-slate-500">Hadir</p><strong className="text-3xl">{present.length}</strong></div><div className="surface-card p-5"><p className="text-sm text-slate-500">Tidak hadir</p><strong className="text-3xl">{absent.length}</strong></div><div className="surface-card p-5"><p className="text-sm text-slate-500">Persentase hadir</p><strong className="text-3xl">{rate}%</strong><div className="mt-3 h-2 rounded bg-slate-200"><div className="h-2 rounded bg-rose-600" style={{width:`${rate}%`}}/></div></div></div>
    <section className="surface-card p-5"><h2 className="font-bold">Kehadiran per kelas</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{classStats.map(([name,s])=><div key={name}><div className="flex justify-between text-sm"><span>{name}</span><span>{s.hadir}/{s.total}</span></div><div className="mt-1 h-2 rounded bg-slate-200"><div className="h-2 rounded bg-pink-600" style={{width:`${s.total?s.hadir*100/s.total:0}%`}}/></div></div>)}</div></section>
    <section className="surface-card p-5"><h2 className="font-bold">Keterangan pertemuan</h2><textarea className="mt-3 min-h-24 w-full rounded-xl border border-slate-300 bg-transparent p-3" value={note} onChange={e=>setNote(e.target.value)} placeholder="Tambahkan keterangan…"/><button onClick={saveNote} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white"><Save size={16}/>Simpan keterangan</button></section>
    <section className="surface-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Ringkasan untuk dibagikan</h2><button onClick={()=>void navigator.clipboard.writeText(summary).then(()=>setMessage('Ringkasan disalin.')).catch(()=>setMessage('Tidak dapat mengakses clipboard.'))} className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm"><Clipboard size={16}/>Salin ringkasan</button></div><pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-100 p-4 text-sm text-slate-700">{summary}</pre></section>
    <section className="surface-card overflow-hidden"><div className="flex flex-wrap items-center gap-3 border-b p-4"><h2 className="mr-auto font-bold">Daftar anggota</h2>{!meeting.is_libur&&<><button onClick={markMissingAlpha} className="min-h-10 rounded-lg border px-3 text-sm">Tandai belum ada data sebagai Alpha</button>{(['hadir','izin','sakit','alpha'] as const).map(s=><button key={s} disabled={!selected.length} onClick={()=>void setBulkStatus(s)} className="min-h-10 rounded-lg border px-3 text-sm disabled:opacity-40">{statusNames[s]} terpilih</button>)}</>}{(['hadir','tidak','semua'] as const).map(t=><button key={t} onClick={()=>setTab(t)} className={`min-h-10 rounded-lg px-3 text-sm ${tab===t?'bg-rose-700 text-white':'border'}`}>{t==='tidak'?'Tidak hadir':t[0].toUpperCase()+t.slice(1)}</button>)}<label className="flex min-h-10 items-center gap-2 rounded-lg border px-3"><Search size={16}/><input className="w-36 bg-transparent text-sm outline-none" placeholder="Nama atau NIS" value={query} onChange={e=>setQuery(e.target.value)}/></label><select className="min-h-10 rounded-lg border bg-transparent px-2" value={kelas} onChange={e=>setKelas(e.target.value)}><option value="">Semua kelas</option>{[...new Set(members.map(m=>m.kelas))].map(k=><option key={k}>{k}</option>)}</select></div>
      {meeting.is_libur?<p className="p-6 text-sm text-slate-500">Daftar tidak hadir disembunyikan untuk pertemuan libur.</p>:<div className="divide-y">{filtered.map(({member,record})=><div key={member.id} className="flex flex-wrap items-center gap-3 p-4"><input aria-label={`Pilih ${member.nama_lengkap}`} type="checkbox" checked={selected.includes(member.id)} onChange={e=>setSelected(e.target.checked?[...selected,member.id]:selected.filter(n=>n!==member.id))}/><div className="min-w-44 flex-1"><p className="font-semibold">{member.nama_lengkap}</p><p className="text-xs text-slate-500">{member.kelas} · {member.jabatan}{member.nis?` · ${member.nis}`:''}</p></div><select className="min-h-11 rounded-lg border bg-transparent px-2 text-sm" value={record?.status||''} onChange={e=>void updateMember(member,e.target.value||'hapus',record)}><option value="">Belum ada data</option><option value="hadir">Hadir</option><option value="izin">Izin</option><option value="sakit">Sakit</option><option value="alpha">Alpha</option></select>{record?.status==='hadir'&&<input aria-label={`Jam scan ${member.nama_lengkap}`} type="time" className="min-h-11 w-28 rounded-lg border bg-transparent px-2 text-sm" defaultValue={(record.waktu_scan||record.scan_time||'').slice(11,16)} onBlur={e=>{if(record.scan_time){const d=new Date(record.scan_time);const [h,m]=e.target.value.split(':').map(Number);d.setHours(h,m);void updateMember(member,'hadir',record,{scan_time:d.toISOString(),waktu_scan:d.toISOString()})}}}/> }<input aria-label={`Catatan ${member.nama_lengkap}`} placeholder="Catatan" className="min-h-11 w-36 rounded-lg border bg-transparent px-2 text-sm" defaultValue={record?.catatan||''} onBlur={e=>record&&void updateMember(member,record.status,record,{catatan:e.target.value})}/><button disabled={!record} onClick={()=>record&&void updateMember(member,'hapus',record)} className="min-h-11 rounded-lg border px-3 text-sm text-rose-700 disabled:opacity-40">Hapus data</button></div>)}{!filtered.length&&<p className="p-8 text-center text-sm text-slate-500">Tidak ada anggota yang cocok.</p>}</div>}
    </section>
  </div>
}
