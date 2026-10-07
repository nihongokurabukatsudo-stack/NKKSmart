import { FormEvent, useEffect, useState } from "react";
import { Search, Trophy, UserRound, LoaderCircle, CalendarDays } from "lucide-react";
import { MemberCard } from "../cards/MemberCard";
import { isSupabaseConfigured, supabase } from "../../services/supabaseClient";

type LeaderRow = { rank: number; nama_tampil: string; kelas_label: string; hadir: number; total: number };
type MemberCardRecord = { nama_lengkap: string; kelas: string; jurusan: string; jabatan: string; kode_unik: string; qr_value: string };
type Leaderboard = { enabled: boolean; periode?: { label: string }; leaderboard?: LeaderRow[]; jadwal_berikutnya?: { nama_pertemuan: string; tanggal: string } | null };

export function MemberHub() {
  const [period, setPeriod] = useState<"semester" | "bulan">("semester");
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [leaderLoading, setLeaderLoading] = useState(true);
  const [name, setName] = useState("");
  const [cardBusy, setCardBusy] = useState(false);
  const [cardError, setCardError] = useState("");
  const [cards, setCards] = useState<MemberCardRecord[]>([]);

  useEffect(() => {
    let active = true;
    setLeaderLoading(true);
    if (!supabase || !isSupabaseConfigured) { setLeaderLoading(false); return; }
    void (async () => {
      try {
        const { data } = await supabase.rpc("get_public_leaderboard", { p_periode: period, p_limit: 9 });
        if (active) setLeaderboard(data as Leaderboard | null);
      } catch {
        if (active) setLeaderboard(null);
      } finally {
        if (active) setLeaderLoading(false);
      }
    })();
    return () => { active = false; };
  }, [period]);

  const searchCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length < 2 || !supabase) return;
    setCardBusy(true); setCardError(""); setCards([]);
    const { data, error } = await supabase.rpc("lookup_member_card" as never, { p_nama: name.trim() } as never);
    setCardBusy(false);
    if (error) { setCardError("Kartu belum dapat dicari. Coba lagi nanti."); return; }
    const result = (data || []) as unknown as MemberCardRecord[];
    if (!result.length) { setCardError("Anggota belum ditemukan. Coba kata lain dari namanya."); return; }
    setCards(result);
  };

  const entries = leaderboard?.leaderboard || [];
  const podium = [
    { row: entries[1], place: 2 },
    { row: entries[0], place: 1 },
    { row: entries[2], place: 3 },
  ].filter((item): item is { row: LeaderRow; place: number } => Boolean(item.row))
  const remainingEntries = entries.slice(3)

  return <section id="anggota" className="min-h-screen w-full bg-nkk-background px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-10">
    <div className="mx-auto w-full max-w-none space-y-8">
      <article className="glass-panel w-full rounded-3xl p-5 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-nkk-red/15 text-nkk-red"><Trophy/></span><div><p className="text-xs font-black tracking-[.16em] text-nkk-red">APRESIASI KEHADIRAN</p><h2 className="text-2xl font-black sm:text-3xl">Leaderboard Anggota</h2></div></div>
          <div className="flex rounded-xl border border-white/10 bg-zinc-950/50 p-1"><button type="button" onClick={() => setPeriod("semester")} aria-pressed={period === "semester"} className={`min-h-10 rounded-lg px-4 text-xs font-bold ${period === "semester" ? "bg-nkk-red text-white" : "text-zinc-300"}`}>Semester</button><button type="button" onClick={() => setPeriod("bulan")} aria-pressed={period === "bulan"} className={`min-h-10 rounded-lg px-4 text-xs font-bold ${period === "bulan" ? "bg-nkk-red text-white" : "text-zinc-300"}`}>Bulan ini</button></div>
        </div>
        <p className="mt-5 text-sm text-zinc-300">{leaderboard?.periode?.label || "Statistik kehadiran"}</p>
        {!isSupabaseConfigured ? <p className="mt-5 rounded-xl bg-zinc-950/60 p-4 text-sm text-zinc-300">Leaderboard akan tampil setelah koneksi NKKSmart dikonfigurasi.</p> : leaderLoading ? <p className="mt-8 flex items-center gap-2 text-sm text-zinc-300"><LoaderCircle className="animate-spin" size={18}/>Memuat leaderboard...</p> : leaderboard?.enabled === false ? <p className="mt-5 rounded-xl bg-zinc-950/60 p-4 text-sm text-zinc-300">Leaderboard sedang dinonaktifkan.</p> : entries.length ? <>
          <div className="mx-auto mt-8 grid min-h-64 w-full max-w-5xl grid-cols-3 items-end gap-2 sm:min-h-80 sm:gap-5">
            {podium.map(({ row, place }) => <div key={`podium-${place}`} className={`flex min-w-0 flex-col items-center justify-end rounded-t-3xl border border-white/10 px-2 pb-4 pt-5 text-center sm:px-5 sm:pb-6 ${place === 1 ? "col-start-2 h-64 bg-gradient-to-b from-rose-700/50 to-zinc-950 sm:h-80" : place === 2 ? "col-start-1 h-52 bg-gradient-to-b from-zinc-500/30 to-zinc-950 sm:h-64" : "col-start-3 h-44 bg-gradient-to-b from-amber-800/30 to-zinc-950 sm:h-56"}`}>
              <Trophy className={`mb-2 h-6 w-6 sm:h-8 sm:w-8 ${place === 1 ? "text-yellow-300" : place === 2 ? "text-zinc-300" : "text-amber-500"}`}/>
              <span className="text-xs font-black uppercase tracking-widest text-zinc-400">#{row.rank}</span>
              <p className="mt-1 line-clamp-2 w-full break-words text-base font-black sm:text-xl">{row.nama_tampil}</p>
              <p className="mt-1 line-clamp-1 w-full text-xs text-zinc-400">{row.kelas_label}</p>
              <p className="mt-3 text-xl font-black text-nkk-pink sm:text-2xl">{row.hadir} hadir</p>
              <p className="text-xs text-zinc-400">dari {row.total} pertemuan</p>
            </div>)}
          </div>
          {remainingEntries.length > 0 && <div className="mx-auto mt-6 grid w-full max-w-5xl gap-2 md:grid-cols-2">{remainingEntries.map((row) => <div key={`${row.rank}-${row.nama_tampil}-${row.kelas_label}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/50 p-3 sm:p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-nkk-red/15 font-black text-nkk-red">{row.rank}</span><div className="min-w-0 flex-1"><p className="truncate font-bold">{row.nama_tampil}</p><p className="text-xs text-zinc-400">{row.kelas_label} · dari {row.total} pertemuan</p></div><span className="text-lg font-black text-nkk-pink">{row.hadir} hadir</span></div>)}</div>}
        </> : <p className="mt-6 rounded-xl bg-zinc-950/60 p-4 text-sm text-zinc-300">Belum ada data kehadiran yang memenuhi syarat periode ini.</p>}
        {leaderboard?.jadwal_berikutnya && <p className="mt-6 flex gap-2 text-xs text-zinc-400"><CalendarDays size={16} className="shrink-0"/>Pertemuan berikutnya: {leaderboard.jadwal_berikutnya.nama_pertemuan} · {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(`${leaderboard.jadwal_berikutnya.tanggal}T00:00:00`))}</p>}
      </article>

      <article className="glass-panel w-full rounded-3xl p-5 sm:p-8 lg:p-10">
        <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-nkk-pink/15 text-nkk-pink"><UserRound/></span><div><p className="text-xs font-black tracking-[.16em] text-nkk-pink">KARTU ANGGOTA</p><h2 className="text-2xl font-black sm:text-3xl">Cari QR milikmu</h2></div></div>
        <p className="mt-4 text-sm leading-6 text-zinc-300">Masukkan nama lengkap yang terdaftar untuk menampilkan kartu dan QR presensi.</p>
        <form onSubmit={searchCard} className="mt-5 flex w-full flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="member-name-search">Cari nama anggota</label><input id="member-name-search" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required placeholder="Ketik sebagian nama, contoh: Fahri" className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-950/70 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-nkk-red focus:outline-none"/><button type="submit" disabled={cardBusy || name.trim().length < 2 || !isSupabaseConfigured} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-nkk-red px-5 text-sm font-black text-white disabled:opacity-50"><Search size={17}/>{cardBusy ? "Mencari..." : "Cari kartu"}</button></form>
        {!isSupabaseConfigured && <p className="mt-3 text-xs text-amber-200">Fitur ini aktif setelah migration NKKSmart diterapkan.</p>}
        {cardError && <p role="status" className="mt-4 rounded-xl border border-nkk-pink/30 bg-nkk-pink/10 p-3 text-sm text-pink-100">{cardError}</p>}
        {cardBusy && <p className="mt-5 flex items-center gap-2 text-sm text-zinc-300"><LoaderCircle className="animate-spin" size={18}/>Mencari kartu...</p>}
        <div className="mt-6 grid w-full justify-items-center gap-5 sm:grid-cols-2 xl:grid-cols-3">{cards.map((card, index) => <div key={`${card.kode_unik}-${index}`} className="flex w-full justify-center rounded-2xl border border-white/10 bg-zinc-950/40 p-3 sm:p-4"><MemberCard id={index + 1} nama={card.nama_lengkap} kelas={card.kelas} jurusan={card.jurusan} kodeUnik={card.kode_unik} qrValue={card.qr_value} jabatan={card.jabatan}/></div>)}</div>
      </article>
    </div>
  </section>;
}
