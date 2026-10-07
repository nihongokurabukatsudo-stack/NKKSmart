export interface NavigationItem {
  label: string;
  href: string;
  children?: NavigationItem[];
}

export const navigationItems: NavigationItem[] = [
  { label: "Beranda", href: "/" },
  {
    label: "Tentang",
    href: "/#tentang",
    children: [
      { label: "Profil", href: "/tentang" },
      { label: "Tim Inti", href: "/tim-inti" },
    ],
  },
  {
    label: "Galeri",
    href: "/galeri",
    children: [
      { label: "Galeri Foto", href: "/galeri" },
    ],
  },
  { label: "Belajar", href: "/#belajar" },
  { label: "Anggota", href: "/#anggota" },
  { label: "Basecamp", href: "/#basecamp" },
];
