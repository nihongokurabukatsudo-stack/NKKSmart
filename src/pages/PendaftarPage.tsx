import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, Loader2, Search, UserCheck, UserX, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

type StatusPendaftar = 'pending' | 'disetujui' | 'ditolak'
interface Pendaftar {
  id: number
  nama_lengkap: string
  kelas: string
  jurusan: string
  nis: string | null
  jenis_kelamin: 'L' | 'P' | null
  kontak: string | null
  alasan: string | null
  status: StatusPendaftar
  created_at: string
  diproses_oleh: string | null
  diproses_pada: string | null
  alasan_tolak: string | null
  anggota_id: number | null
  pemroses?: { username: string; full_name: string } | null
}
interface EditPendaftar { nama_lengkap: string; kelas: string; jurusan: string; nis: string; jenis_kelamin: 'L' | 'P' }
interface DuplicateCandidate { nama_lengkap: string; kelas: string; jurusan: string }

const normalizeName = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('id-ID').replace(/[^a-z0-9]+/g, ' ').trim()
const levenshtein = (left: string, right: string) => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 1; i <= left.length; i++) {
    let previous = row[0]
    row[0] = i
    for (let j = 1; j <= right.length; j++) {
      const old = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1))
      previous = old
    }
  }
  return row[right.length]
}
const likelyDuplicate = (name: string, candidates: DuplicateCandidate[]) => {
  const normalized = normalizeName(name)
  return candidates.find((candidate) => {
    const other = normalizeName(candidate.nama_lengkap)
    const distance = levenshtein(normalized, other)
    return normalized === other || (Math.max(normalized.length, other.length) > 0 && 1 - distance / Math.max(normalized.length, other.length) >= 0.84)
  })
}
const displayTime = (value: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value)) : '-'

const PendaftarCard: React.FC<{ item: Pendaftar; duplicate?: DuplicateCandidate; onApprove: () => void; onReject: () => void }> = ({ item, duplicate, onApprove, onReject }) => <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-white">{item.nama_lengkap}</h3><p className="mt-1 text-sm text-slate-300">{item.kelas} · {item.jurusan} · {item.jenis_kelamin || '-'}</p></div><span className="rounded-full border border-slate-600 px-2 py-1 text-xs text-slate-200">{item.status}</span></div>
  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm"><div><dt className="text-xs text-slate-400">NIS</dt><dd className="break-all text-slate-100">{item.nis ?? '-'}</dd></div><div><dt className="text-xs text-slate-400">Kontak</dt><dd className="break-all text-slate-100">{item.kontak || '-'}</dd></div><div className="col-span-2"><dt className="text-xs text-slate-400">Alasan bergabung</dt><dd className="whitespace-pre-wrap text-slate-100">{item.alasan || '-'}</dd></div><div className="col-span-2"><dt className="text-xs text-slate-400">Waktu daftar</dt><dd className="text-slate-100">{displayTime(item.created_at)}</dd></div></dl>
  {duplicate && <p className="mt-3 flex gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-100"><AlertTriangle className="h-4 w-4 shrink-0"/>Kemungkinan mirip dengan anggota {duplicate.nama_lengkap} ({duplicate.kelas} {duplicate.jurusan}). Periksa sebagai informasi; NIS bukan penentu duplikasi.</p>}
  {item.status === 'pending' ? <div className="mt-4 flex gap-2"><button type="button" onClick={onApprove} className="min-h-11 flex-1 rounded-xl bg-pink-600 px-3 text-sm font-semibold text-white hover:bg-pink-500">Setujui</button><button type="button" onClick={onReject} className="min-h-11 rounded-xl border border-rose-400/50 px-3 text-sm font-semibold text-rose-200 hover:bg-rose-500/10">Tolak</button></div> : <div className="mt-3 border-t border-slate-700 pt-3 text-xs text-slate-300"><p>Diproses: {item.pemroses?.full_name || item.pemroses?.username || 'Admin'} · {displayTime(item.diproses_pada)}</p>{item.alasan_tolak && <p className="mt-1">Alasan penolakan: {item.alasan_tolak}</p>}{item.anggota_id && <Link to="/admin/anggota" className="mt-2 inline-flex min-h-10 items-center text-pink-300 underline">Buka data anggota #{item.anggota_id}</Link>}</div>}
</article>

export const PendaftarPage: React.FC = () => {
  const [tab, setTab] = useState<StatusPendaftar>('pending')
  const [items, setItems] = useState<Pendaftar[]>([])
  const [members, setMembers] = useState<DuplicateCandidate[]>([])
  const [search, setSearch] = useState('')
  const [kelasFilter, setKelasFilter] = useState('all')
  const [jurusanFilter, setJurusanFilter] = useState('all')
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Pendaftar | null>(null)
  const [editForm, setEditForm] = useState<EditPendaftar | null>(null)
  const [rejecting, setRejecting] = useState<Pendaftar | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [toast, setToast] = useState<{ message: string; code?: string } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    const [{ data, error: listError }, { data: memberRows }] = await Promise.all([
      (supabase.from('pendaftar' as any) as any).select('*,pemroses:admins!pendaftar_diproses_oleh_fkey(username,full_name)').eq('status', tab).order('created_at', { ascending: false }).limit(500),
      supabase.from('anggota').select('nama_lengkap,kelas,jurusan').eq('status', 'Aktif').eq('is_deleted', false),
    ])
    if (listError) setError(`Gagal memuat pendaftar. Pastikan migration database telah diterapkan. ${listError.message}`)
    setItems((data || []) as Pendaftar[])
    setMembers((memberRows || []) as DuplicateCandidate[])
    setSelected([])
    setLoading(false)
  }, [tab])

  useEffect(() => { void fetchData() }, [fetchData])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 8000); return () => window.clearTimeout(timer) }, [toast])

  const filtered = useMemo(() => items.filter((item) => {
    if (kelasFilter !== 'all' && item.kelas !== kelasFilter) return false
    if (jurusanFilter !== 'all' && item.jurusan !== jurusanFilter) return false
    const query = search.trim().toLocaleLowerCase('id-ID')
    return !query || `${item.nama_lengkap} ${item.nis || ''} ${item.kelas} ${item.jurusan}`.toLocaleLowerCase('id-ID').includes(query)
  }), [items, kelasFilter, jurusanFilter, search])
  const classes = useMemo(() => [...new Set(items.map((item) => item.kelas))].sort(), [items])
  const majors = useMemo(() => [...new Set(items.map((item) => item.jurusan))].sort(), [items])

  const openApprove = (item: Pendaftar) => {
    setEditing(item)
    setEditForm({ nama_lengkap: item.nama_lengkap, kelas: item.kelas, jurusan: item.jurusan, nis: item.nis ?? '', jenis_kelamin: item.jenis_kelamin || 'L' })
  }
  const approveOne = async (item: Pendaftar, form: EditPendaftar) => {
    const { data, error: rpcError } = await (supabase.rpc as any)('approve_pendaftaran', { p_id: item.id, p_ubah: form })
    if (rpcError) throw rpcError
    if (!data?.ok) throw new Error(data?.message || 'Persetujuan gagal.')
    return String(data.kode || '')
  }
  const submitApprove = async () => {
    if (!editing || !editForm) return
    setBusyId(editing.id)
    try {
      const code = await approveOne(editing, editForm)
      setEditing(null)
      setToast({ message: 'Pendaftar disetujui. Anggota dan barcode berhasil dibuat.', code })
      await fetchData()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Persetujuan gagal.') }
    finally { setBusyId(null) }
  }
  const submitReject = async () => {
    if (!rejecting) return
    setBusyId(rejecting.id)
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('reject_pendaftaran', { p_id: rejecting.id, p_alasan: rejectReason })
      if (rpcError) throw rpcError
      if (!data?.ok) throw new Error(data?.message || 'Penolakan gagal.')
      setRejecting(null); setRejectReason(''); setToast({ message: 'Pendaftar ditolak.' }); await fetchData()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Penolakan gagal.') }
    finally { setBusyId(null) }
  }
  const approveSelected = async () => {
    const selectedItems = items.filter((item) => selected.includes(item.id))
    if (!selectedItems.length || !window.confirm(`Setujui ${selectedItems.length} pendaftar terpilih?`)) return
    setBulkBusy(true)
    let succeeded = 0
    const failed: string[] = []
    for (const item of selectedItems) {
      try {
        const code = await approveOne(item, { nama_lengkap: item.nama_lengkap, kelas: item.kelas, jurusan: item.jurusan, nis: item.nis || '', jenis_kelamin: item.jenis_kelamin || 'L' })
        succeeded++
        setToast({ message: `Berhasil menyetujui ${item.nama_lengkap}.`, code })
      } catch (cause) { failed.push(`${item.nama_lengkap}: ${cause instanceof Error ? cause.message : 'gagal'}`) }
    }
    setBulkBusy(false)
    setSelected([])
    await fetchData()
    setError(`Aksi massal selesai: ${succeeded} berhasil, ${failed.length} gagal.${failed.length ? ` ${failed.join('; ')}` : ''}`)
  }

  const duplicateFor = (item: Pendaftar) => likelyDuplicate(item.nama_lengkap, members.filter((member) => member.kelas === item.kelas && member.jurusan === item.jurusan))
  const toggleSelected = (id: number) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])

  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-white">Pendaftar</h1><p className="mt-1 text-sm text-slate-300">Kelola pendaftaran anggota baru.</p></div>{tab === 'pending' && <button type="button" onClick={() => void approveSelected()} disabled={bulkBusy || selected.length === 0} className="min-h-11 rounded-xl bg-pink-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{bulkBusy ? 'Memproses...' : `Setujui terpilih (${selected.length})`}</button>}</header>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Status pendaftar">{([['pending', 'Pending'], ['disetujui', 'Disetujui'], ['ditolak', 'Ditolak']] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${tab === value ? 'border-pink-400 bg-pink-500/20 text-pink-100' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}>{label}</button>)}</div>
    <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto_auto]"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau NIS" className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 pl-10 pr-3 text-sm text-white placeholder:text-slate-400"/></label><select aria-label="Filter kelas" value={kelasFilter} onChange={(event) => setKelasFilter(event.target.value)} className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white"><option value="all">Semua kelas</option>{classes.map((value) => <option key={value}>{value}</option>)}</select><select aria-label="Filter jurusan" value={jurusanFilter} onChange={(event) => setJurusanFilter(event.target.value)} className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white"><option value="all">Semua jurusan</option>{majors.map((value) => <option key={value}>{value}</option>)}</select></div>
    {tab === 'pending' && filtered.length > 0 && <label className="inline-flex min-h-10 items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={filtered.every((item) => selected.includes(item.id))} onChange={(event) => setSelected(event.target.checked ? [...new Set([...selected, ...filtered.map((item) => item.id)])] : selected.filter((id) => !filtered.some((item) => item.id === id)))} className="accent-pink-500"/>Pilih semua hasil ({filtered.length})</label>}
    {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div>}
    {loading ? <div className="flex min-h-40 items-center justify-center text-slate-300"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Memuat pendaftar...</div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-600 p-10 text-center text-slate-300">Belum ada pendaftar pada tab ini.</div> : <div className="grid gap-3 xl:grid-cols-2">{filtered.map((item) => <div key={item.id} className="relative">{tab === 'pending' && <input type="checkbox" aria-label={`Pilih ${item.nama_lengkap}`} checked={selected.includes(item.id)} onChange={() => toggleSelected(item.id)} className="absolute right-4 top-4 z-10 h-5 w-5 accent-pink-500"/>}<PendaftarCard item={item} duplicate={tab === 'pending' ? duplicateFor(item) : undefined} onApprove={() => openApprove(item)} onReject={() => setRejecting(item)}/></div>)}</div>}

    {editing && editForm && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => !busyId && setEditing(null)}><section role="dialog" aria-modal="true" aria-labelledby="approve-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 id="approve-title" className="text-lg font-bold text-white">Setujui pendaftar</h2><button type="button" aria-label="Tutup" onClick={() => setEditing(null)} className="min-h-10 min-w-10 rounded-lg text-slate-300"><X/></button></div><p className="mt-1 text-sm text-slate-300">Periksa atau koreksi data sebelum membuat anggota dan QR.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{([['nama_lengkap','Nama lengkap'],['kelas','Kelas'],['jurusan','Jurusan'],['nis','NIS (boleh sama)']] as const).map(([key,label])=><label key={key} className="text-sm font-medium text-slate-200">{label}<input value={editForm[key]} onChange={(event)=>setEditForm({...editForm,[key]:event.target.value})} maxLength={key==='nama_lengkap'?120:undefined} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white"/></label>)}<label className="text-sm font-medium text-slate-200">Jenis kelamin<select value={editForm.jenis_kelamin} onChange={(event)=>setEditForm({...editForm,jenis_kelamin:event.target.value as 'L'|'P'})} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white"><option value="L">L</option><option value="P">P</option></select></label></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setEditing(null)} className="min-h-11 rounded-xl border border-slate-600 px-4 text-slate-200">Batal</button><button type="button" disabled={busyId===editing.id} onClick={()=>void submitApprove()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-pink-600 px-4 font-semibold text-white disabled:opacity-50">{busyId===editing.id?<Loader2 className="h-4 w-4 animate-spin"/>:<UserCheck className="h-4 w-4"/>}Setujui</button></div></section></div>}
    {rejecting && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={()=>!busyId&&setRejecting(null)}><section role="dialog" aria-modal="true" aria-labelledby="reject-title" className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5" onClick={(event)=>event.stopPropagation()}><h2 id="reject-title" className="text-lg font-bold text-white">Tolak pendaftaran {rejecting.nama_lengkap}?</h2><label className="mt-4 block text-sm text-slate-200">Alasan (opsional)<textarea value={rejectReason} onChange={(event)=>setRejectReason(event.target.value)} maxLength={500} rows={3} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"/></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setRejecting(null)} className="min-h-11 rounded-xl border border-slate-600 px-4 text-slate-200">Batal</button><button type="button" disabled={busyId===rejecting.id} onClick={()=>void submitReject()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-700 px-4 font-semibold text-white disabled:opacity-50"><UserX className="h-4 w-4"/>Tolak</button></div></section></div>}
    {toast && <div role="status" className="fixed bottom-4 right-4 z-[110] max-w-md rounded-xl border border-pink-400/40 bg-slate-900 p-4 text-sm text-white shadow-2xl"><p className="flex gap-2"><Check className="h-5 w-5 shrink-0 text-pink-300"/>{toast.message}{toast.code && <b>{toast.code}</b>}</p>{toast.code && <Link to="/admin/kartu" className="mt-2 inline-block text-pink-300 underline">Cetak kartu</Link>}</div>}
  </div>
}
