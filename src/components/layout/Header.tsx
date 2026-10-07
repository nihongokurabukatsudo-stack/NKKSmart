import { useState } from "react";
import { Link } from "react-router-dom";
import { navigationItems } from "../../constants/navigation";
import { Button } from "../ui/Button";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-nkk-background/70 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
        <Link to="/" className="flex items-center gap-3 text-white">
          <img src="/assets/logo/logo-nkk-white.png" alt="Logo NKK" className="h-12 w-12 object-contain" />
          <span className="text-sm font-black leading-tight tracking-wide sm:text-base">
            NIHONGO <span className="text-nkk-red">KURABU KATSUDO</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-bold text-white/90 lg:flex">
          {navigationItems.map((item) => (
            <a key={item.label} href={item.href} className="transition hover:text-nkk-red">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Button href="/register" isRouteLink className="min-h-11 px-5 py-2">
            Gabung Sekarang
          </Button>
        </div>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-white/5 text-white transition hover:border-nkk-red hover:text-nkk-red lg:hidden"
          aria-label="Buka menu"
          onClick={() => setIsMenuOpen(true)}
        >
          <span className="relative h-4 w-5">
            <span className="absolute left-0 top-0 h-0.5 w-5 bg-current" />
            <span className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 bg-current" />
            <span className="absolute bottom-0 left-0 h-0.5 w-5 bg-current" />
          </span>
        </button>
      </div>

      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </header>
  );
}
