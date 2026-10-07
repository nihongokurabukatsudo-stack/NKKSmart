import { ArrowRight, Landmark, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionBadge } from "../ui/SectionBadge";

const statistics = [
  { label: "Tahun Berdiri", value: "2008" },
  { label: "Alumni", value: "500+" },
  { label: "Pengurus Aktif", value: "30" },
  { label: "Materi per Tahun", value: "20+" },
];

export function AboutSection() {
  return (
    <section id="tentang" className="bg-nkk-background px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <SectionBadge>TENTANG KAMI</SectionBadge>
          <h2 className="mt-5 text-4xl font-black leading-tight text-white sm:text-5xl">
            Mengenal Lebih Dekat NIHONGO KURABU KATSUDO
          </h2>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <article className="glass-panel rounded-3xl p-7 sm:p-9">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-nkk-red/15 text-nkk-red">
              <Landmark size={24} />
            </div>
            <p className="mt-6 text-sm font-black tracking-[0.14em] text-nkk-red">日本語クラブ</p>
            <h3 className="mt-3 text-3xl font-black text-white">NIHONGO KURABU KATSUDO</h3>
            <p className="mt-5 text-base leading-8 text-zinc-300">
              NIHONGO KURABU KATSUDO adalah ekstrakurikuler bahasa dan budaya Jepang yang menjadi ruang belajar
              kolaboratif bagi siswa SMK Negeri 2 Tasikmalaya. Berdiri pada 2018, NKK tumbuh melalui latihan
              bahasa, pengenalan budaya, kegiatan kreatif, dan partisipasi dalam berbagai perlombaan.
            </p>
            <Link
              to="/tentang"
              className="mt-7 inline-flex items-center gap-2 text-sm font-black text-nkk-red transition hover:text-white"
            >
              Baca profil lengkap <ArrowRight size={16} />
            </Link>
          </article>

          <div className="grid grid-cols-2 gap-4">
            {statistics.map((statistic) => (
              <div key={statistic.label} className="rounded-3xl border border-white/10 bg-nkk-panel p-5 text-white shadow-soft transition hover:-translate-y-1 hover:border-nkk-red/40 sm:p-6">
                <Sparkles size={18} className="text-nkk-pink" />
                <p className="mt-4 text-3xl font-black text-nkk-red sm:text-4xl">{statistic.value}</p>
                <p className="mt-3 text-sm font-bold text-zinc-300">{statistic.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
