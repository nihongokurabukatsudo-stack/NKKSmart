import { BookOpen, Goal, History, Home, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionBadge } from "../components/ui/SectionBadge";

const missions = [
  "Meningkatkan minat siswa dalam belajar bahasa Jepang melalui kegiatan yang interaktif dan menarik.",
  "Mengenalkan budaya Jepang (kebiasaan, etika, dan seni) kepada siswa di sekolah.",
  "Mengadakan kegiatan rutin seperti belajar bersama, games, dan event bertema Jepang.",
  "Membangun suasana klub yang aktif, solid, dan saling mendukung.",
  "Mengadakan event atau festival kecil, seperti lomba, cosplay, maupun Hari Budaya Jepang.",
];

export function AboutPage() {
  return (
    <main className="min-h-screen bg-nkk-background px-5 py-10 text-white sm:px-8 lg:py-14">
      <div className="mx-auto max-w-7xl">
        <Link to="/" aria-label="Kembali ke Beranda" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-zinc-300 transition hover:border-nkk-red hover:text-white"><Home size={19} /></Link>

        <header className="mt-8 max-w-4xl">
          <SectionBadge>TENTANG NKK</SectionBadge>
          <h1 className="mt-5 text-5xl font-black leading-tight sm:text-6xl">
            Cerita, visi, dan arah NIHONGO KURABU KATSUDO
          </h1>
        </header>

        <section className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="glass-panel rounded-3xl p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-nkk-purple/15 text-nkk-purple">
              <History size={24} />
            </div>
            <h2 className="mt-6 text-3xl font-black">Sejarah</h2>
            <p className="mt-4 text-base leading-8 text-zinc-300">
              Sejak 2008, NIHONGO KURABU KATSUDO menjadi ruang bagi siswa untuk mengenal bahasa dan budaya Jepang,
              berlatih bersama, serta membangun pengalaman berorganisasi yang positif.
            </p>
          </article>

          <article className="glass-panel rounded-3xl p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-nkk-red/15 text-nkk-red">
              <Goal size={24} />
            </div>
            <h2 className="mt-6 text-3xl font-black">VISI</h2>
            <p className="mt-4 text-base leading-8 text-zinc-300">
              Menjadikan NKK sebagai wadah pembelajaran yang aktif, menyenangkan, serta mampu mengenalkan dan
              menerapkan budaya Jepang di lingkungan sekolah.
            </p>
          </article>
        </section>

        <section className="mt-5 glass-panel rounded-3xl p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-nkk-pink/15 text-nkk-pink">
            <BookOpen size={24} />
          </div>
          <h2 className="mt-6 text-3xl font-black">MISI</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {missions.map((mission) => (
              <div key={mission} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <Sparkles size={18} className="text-nkk-red" />
                <p className="mt-3 text-sm font-semibold leading-7 text-zinc-300">{mission}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
