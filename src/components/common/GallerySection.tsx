import { galleryImages } from "../../data/gallery";
import { useCarousel } from "../../hooks/useCarousel";
import { Button } from "../ui/Button";
import { SectionBadge } from "../ui/SectionBadge";

export function GallerySection() {
  const { activeIndex, goToNextSlide, goToPreviousSlide, goToSlide } = useCarousel(galleryImages.length);
  const activeImage = galleryImages[activeIndex];

  return (
    <section id="galeri" className="bg-nkk-panelSoft px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <SectionBadge>DOKUMENTASI</SectionBadge>
          <h2 className="mt-5 text-4xl font-black leading-tight text-white sm:text-5xl">Galeri Kenangan</h2>
          <p className="mt-4 text-base leading-8 text-zinc-300">
            Potongan momen kegiatan, latihan, dan kebersamaan keluarga besar NIHONGO KURABU KATSUDO.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-nkk-panel shadow-soft">
          <div className="relative aspect-[4/3] sm:aspect-[16/9]">
            <img src={activeImage.imageUrl} alt={activeImage.caption} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/88 to-transparent p-5 sm:p-7">
              <p className="max-w-3xl text-base font-extrabold leading-7 text-white sm:text-xl">{activeImage.caption}</p>
            </div>

            <button
              type="button"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-nkk-panel/90 text-2xl font-bold text-white transition hover:bg-nkk-red hover:text-zinc-950"
              onClick={goToPreviousSlide}
              aria-label="Foto sebelumnya"
            >
              ‹
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-nkk-panel/90 text-2xl font-bold text-white transition hover:bg-nkk-red hover:text-zinc-950"
              onClick={goToNextSlide}
              aria-label="Foto berikutnya"
            >
              ›
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {galleryImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className={`h-3 rounded-full transition ${
                index === activeIndex ? "w-8 bg-nkk-red" : "w-3 bg-white/25 hover:bg-white"
              }`}
              onClick={() => goToSlide(index)}
              aria-label={`Tampilkan foto ${index + 1}`}
            />
          ))}
        </div>

        <div className="mt-9 flex justify-center">
          <Button href="/galeri" isRouteLink variant="dark">
            Buka Galeri Penuh
          </Button>
        </div>
      </div>
    </section>
  );
}
