import { Camera, GitFork, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const navigation = [
  { label: "Beranda", href: "/" }, { label: "Tentang", href: "/#tentang" },
  { label: "Belajar", href: "/#belajar" }, { label: "Galeri", href: "/galeri" },
  { label: "Basecamp", href: "/#basecamp" },
];
const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/nkk_smk2tasik?igsh=MXV0bWlqaDdna2ptdQ%3D%3D", icon: Camera },
  { label: "Email", href: "mailto:nihongokurabukatsudo@gmail.com", icon: Mail },
  { label: "GitHub", href: "https://github.com/nihongokurabukatsudo-stack", icon: GitFork },
];

export function Footer() {
  return <footer className="border-t border-white/10 bg-[#121214] text-white">
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <div className="flex items-center gap-3"><img src="/assets/logo/logo-nkk-white.png" alt="Logo NIHONGO KURABU KATSUDO" className="h-14 w-14 object-contain" /><p className="text-xl font-black tracking-tight">NIHONGO <span className="text-nkk-red">KURABU KATSUDO</span></p></div>
        <p className="mt-5 max-w-md text-sm leading-7 text-zinc-300">Organisasi bahasa dan budaya Jepang di SMK Negeri 2 Tasikmalaya. Belajar dengan hangat, berkarya dengan berani.</p>
        <div className="mt-7 flex gap-3">{socialLinks.map(({ label, href, icon: Icon }) => <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} aria-label={label} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-zinc-200 transition hover:-translate-y-1 hover:border-nkk-red hover:bg-nkk-red hover:text-white"><Icon size={19} /></a>)}</div>
      </div>
      <div><p className="text-xs font-black tracking-[0.16em] text-nkk-red">NAVIGASI</p><nav className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-sm font-bold text-zinc-300">{navigation.map((item) => <Link key={item.label} to={item.href} className="transition hover:text-white">{item.label}</Link>)}</nav></div>
    </div>
    <div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-6 text-xs font-medium text-zinc-500 sm:px-8"><span>© 2026 NIHONGO KURABU KATSUDO · SMK Negeri 2 Tasikmalaya</span><span>Dibuat dengan cinta oleh Developer.</span></div></div>
  </footer>;
}
