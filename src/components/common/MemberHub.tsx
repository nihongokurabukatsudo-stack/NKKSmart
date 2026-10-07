import { FormEvent, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Search, Trophy, UserRound, LoaderCircle, CalendarDays } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../../services/supabaseClient";

type LeaderRow = { rank: number; nama_tampil: string; kelas_label: string; hadir: number; total: number; persen: number };
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
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    setLeaderLoading(true);
    if (!supabase || !isSupabaseConfigured) { setLeaderLoading(false); return; }
    void (async () => {
      try {
        const { data } = await supabase.rpc("get_public_leaderboard", { p_periode: period, p_limit: 10 });
        if (active) setLeaderboard(data as Leaderboard | null);
      } catch {
        if (active) setLeaderboard(null);
      } finally {
        if (active) setLeaderLoading(false);
      }
    })();
    return () => { active = false; };
  }, [period]);

  useEffect(() => {
    let active = true;
    Promise.all(cards.map(async (card) => [card.kode_unik, await QRCode.toDataURL(card.qr_value, { width: 320, margin: 2 })] as const))
      .then((entries) => { if (active) setQrImages(Object.fromEntries(entries)); })
      .catch(() => { if (active) setQrImages({}); });
    return () => { active = false; };
  }, [cards]);

  const searchCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length < 3 || !supabase) return;
    setCardBusy(true); setCardError(""); setCards([]); setQrImages({});
    const { data, error } = await supabase.rpc("lookup_member_card" as never, { p_nama: name.trim() } as never);
    setCardBusy(false);
    if (error) { setCardError("Kartu belum dapat dicari. Coba lagi nanti."); return; }
    const result = (data || []) as unknown as MemberCardRecord[];
    if (!result.length) { setCardError("Nama belum ditemukan. Pastikan nama sesuai data anggota di NKKSmart."); return; }
    setCards(result);
  };

  return <section id="anggota" className="bg-nkk-background px-5 py-20 text-white sm:px-8 lg:py-24">
    <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-2">
      <article className="glass-panel rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-nkk-red/15 text-nkk-red"><Trophy/></span><div><p className="text-xs font-black tracking-[.16em] text-nkk-red">APRESIASI KEHADIRAN</p><h2 className="text-2xl font-black sm:text-3xl">Leaderboard Anggota</h2></div></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-zinc-300">{leaderboard?.periode?.label || "Statistik kehadiran"}</p><div className="flex rounded-xl border border-white/10 bg-zinc-950/50 p-1"><button type="button" onClick={() => setPeriod("semester")} aria-pressed={period === "semester"} className={`min-h-10 rounded-lg px-3 text-xs font-bold ${period === "semester" ? "bg-nkk-red text-white" : "text-zinc-300"}`}>Semester</button><button type="button" onClick={() => setPeriod("bulan")} aria-pressed={period === "bulan"} className={`min-h-10 rounded-lg px-3 text-xs font-bold ${period === "bulan" ? "bg-nkk-red text-white" : "text-zinc-300"}`}>Bulan ini</button></div></div>
        {!isSupabaseConfigured ? <p className="mt-5 rounded-xl bg-zinc-950/60 p-4 text-sm text-zinc-300">Leaderboard akan tampil setelah koneksi NKKSmart dikonfigurasi.</p> : leaderLoading ? <p className="mt-8 flex items-center gap-2 text-sm text-zinc-300"><LoaderCircle className="animate-spin" size={18}/>Memuat leaderboard...</p> : leaderboard?.enabled === false ? <p className="mt-5 rounded-xl bg-zinc-950/60 p-4 text-sm text-zinc-300">Leaderboard sedang dinonaktifkan.</p> : <div className="mt-5 space-y-2">{leaderboard?.leaderboard?.length ? leaderboard.leaderboard.map((row) => <div key={`${row.rank}-${row.nama_tampil}-${row.kelas_label}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/50 p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-nkk-red/15 font-black text-nkk-red">{row.rank}</span><div className="min-w-0 flex-1"><p className="truncate font-bold">{row.nama_tampil}</p><p className="text-xs text-zinc-400">{row.kelas_label} · {row.hadir}/{row.total} pertemuan</p></div><span className="text-lg font-black text-nkk-pink">{row.persen}%</span></div>) : <p className="rounded-xl bg-zinc-950/60 p-4 text-sm text-zinc-300">Belum ada data kehadiran yang memenuhi syarat periode ini.</p>}
          {leaderboard?.jadwal_berikutnya && <p className="mt-4 flex gap-2 text-xs text-zinc-400"><CalendarDays size={16} className="shrink-0"/>Pertemuan berikutnya: {leaderboard.jadwal_berikutnya.nama_pertemuan} · {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(`${leaderboard.jadwal_berikutnya.tanggal}T00:00:00`))}</p>}</div>}
      </article>

      <article className="glass-panel rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-nkk-pink/15 text-nkk-pink"><UserRound/></span><div><p className="text-xs font-black tracking-[.16em] text-nkk-pink">KARTU ANGGOTA</p><h2 className="text-2xl font-black sm:text-3xl">Cari QR milikmu</h2></div></div>
        <p className="mt-4 text-sm leading-6 text-zinc-300">Masukkan nama lengkap yang terdaftar untuk menampilkan kartu dan QR presensi.</p>
        <form onSubmit={searchCard} className="mt-5 flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="member-name-search">Nama lengkap</label><input id="member-name-search" value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={120} required placeholder="Nama lengkap" className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-950/70 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-nkk-red focus:outline-none"/><button type="submit" disabled={cardBusy || name.trim().length < 3 || !isSupabaseConfigured} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-nkk-red px-5 text-sm font-black text-white disabled:opacity-50"><Search size={17}/>{cardBusy ? "Mencari..." : "Cari kartu"}</button></form>
        {!isSupabaseConfigured && <p className="mt-3 text-xs text-amber-200">Fitur ini aktif setelah migration NKKSmart diterapkan.</p>}
        {cardError && <p role="status" className="mt-4 rounded-xl border border-nkk-pink/30 bg-nkk-pink/10 p-3 text-sm text-pink-100">{cardError}</p>}
        {cardBusy && <p className="mt-5 flex items-center gap-2 text-sm text-zinc-300"><LoaderCircle className="animate-spin" size={18}/>Mencari kartu...</p>}
        <div className="mt-5 space-y-4">{cards.map((card) => <div key={card.kode_unik} className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:flex-row"><div className="flex min-h-40 w-full max-w-72 flex-col justify-between rounded-2xl border border-white/20 bg-gradient-to-br from-rose-950 via-zinc-900 to-black p-4 shadow-xl"><div className="flex items-center gap-3"><img src="/assets/logo/logo-nkk-white.png" alt="Logo NKK" className="h-9 w-9 object-contain"/><div><p className="text-xs font-black text-pink-200">NKK BAHASA JEPANG</p><p className="text-[10px] font-bold tracking-wider text-zinc-300">KARTU {card.jabatan.toUpperCase()}</p></div></div><div><p className="break-words text-base font-black text-white">{card.nama_lengkap}</p><p className="mt-1 text-xs font-semibold text-pink-100">{card.kelas} · {card.jurusan}</p><p className="mt-2 inline-block rounded-lg bg-white px-2 py-1 font-mono text-xs font-bold text-rose-900">{card.kode_unik}</p></div></div>{qrImages[card.kode_unik] ? <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-3"><img src={qrImages[card.kode_unik]} alt={`QR presensi ${card.nama_lengkap}`} className="h-32 w-32"/><p className="text-[10px] font-bold text-zinc-800">QR PRESENSI</p></div> : <div className="h-36 w-36 animate-pulse rounded-xl bg-white/10"/>}</div>)}</div>
      </article>
    </div>
  </section>;
}
