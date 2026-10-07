export interface GalleryItem {
  id: string;
  imageUrl: string;
  caption: string;
}

export const galleryImages: GalleryItem[] = [
  {
    id: "1",
    imageUrl: "/assets/gallery/gallery-01.webp",
    caption: "Otanjoubi omedetou gozaimashita, sensei-tachi!",
  },
  {
    id: "2",
    imageUrl: "/assets/gallery/gallery-02.webp",
    caption: "Momen latihan dan kebersamaan anggota NIHONGO KURABU KATSUDO.",
  },
  {
    id: "3",
    imageUrl: "/assets/gallery/gallery-03.webp",
    caption: "Belajar budaya Jepang melalui kegiatan klub yang hangat.",
  },
  {
    id: "4",
    imageUrl: "/assets/gallery/gallery-04.webp",
    caption: "Dokumentasi acara dan penampilan anggota NKK.",
  },
  {
    id: "5",
    imageUrl: "/assets/gallery/gallery-05.webp",
    caption: "Kenangan seru bersama keluarga besar NIHONGO KURABU KATSUDO.",
  },
];
