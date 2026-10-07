import { useState } from "react";
import { Link } from "react-router-dom";
import { navigationItems } from "../../constants/navigation";
import { Button } from "../ui/Button";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const [openSection, setOpenSection] = useState<string | null>("Tentang");

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0b0d] px-6 py-6 text-white shadow-2xl">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" onClick={onClose}>
          <img src="/assets/logo/logo-nkk-white.png" alt="Logo NKK" className="h-12 w-12 object-contain" />
          <span className="text-base font-black tracking-wide">
            NIHONGO <span className="text-nkk-red">KURABU KATSUDO</span>
          </span>
        </Link>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-nkk-panel text-2xl font-light transition hover:border-nkk-red hover:text-nkk-red"
          aria-label="Tutup menu"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <nav className="mt-12 flex flex-1 flex-col gap-2">
        {navigationItems.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const isExpanded = openSection === item.label;

          if (!hasChildren) {
            return (
              <a key={item.label} href={item.href} onClick={onClose} className="py-4 text-2xl font-black hover:text-nkk-red">
                {item.label}
              </a>
            );
          }

          return (
            <div key={item.label} className="border-b border-white/15 pb-2">
              <button
                type="button"
                className="flex w-full items-center justify-between py-4 text-left text-2xl font-black"
                onClick={() => setOpenSection(isExpanded ? null : item.label)}
                aria-expanded={isExpanded}
              >
                {item.label}
                <span className="text-3xl font-light">{isExpanded ? "-" : "+"}</span>
              </button>

              {isExpanded && (
                <div className="mb-3 grid gap-3 pl-4 text-base font-bold text-zinc-300">
                  {item.children?.map((child) => (
                    <a key={child.label} href={child.href} onClick={onClose}>
                      {child.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <Button href="/register" isRouteLink onClick={onClose} className="mt-8 w-full">
          Gabung Sekarang
        </Button>
      </nav>

      <div className="border-t border-white/15 pt-5">
        <div className="flex items-center gap-3">
          <img src="/assets/logo/logo-nkk-white.png" alt="Logo NKK" className="h-10 w-10 object-contain" />
          <div>
            <p className="text-sm font-black">NIHONGO KURABU KATSUDO</p>
            <p className="text-xs text-white/60">© 2026 · SMK Negeri 2 Tasikmalaya</p>
          </div>
        </div>
      </div>
    </div>
  );
}
