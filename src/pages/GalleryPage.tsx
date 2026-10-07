import { Home } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionBadge } from "../components/ui/SectionBadge";
import { galleryImages } from "../data/gallery";

export function GalleryPage() {
  return (
    <main className="min-h-screen bg-nkk-background px-5 py-10 text-white sm:px-8 lg:py-14">
      <div className="mx-auto max-w-7xl">
        <Link to="/" aria-label="Kembali ke Beranda" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-zinc-300 transition hover:border-nkk-red hover:text-white"><Home size={19} /></Link>
        <header className="mt-8 max-w-3xl"><SectionBadge>DOKUMENTASI</SectionBadge><h1 className="mt-5 text-5xl font-black leading-tight sm:text-6xl">Galeri Penuh</h1><p className="mt-5 text-base leading-8 text-zinc-300">Seluruh momen kebersamaan, latihan, dan kegiatan NIHONGO KURABU KATSUDO.</p></header>
        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {galleryImages.map((image) => <article key={image.id} className="group overflow-hidden rounded-3xl border border-white/10 bg-nkk-panel shadow-soft transition duration-300 hover:-translate-y-1 hover:border-nkk-red/40 hover:shadow-neon"><div className="aspect-[4/3] overflow-hidden"><img src={image.imageUrl} alt={image.caption} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div><p className="p-5 text-sm font-bold leading-6 text-zinc-200">{image.caption}</p></article>)}
        </section>
      </div>
    </main>
  );
}
