import type { ReactNode } from "react";

interface SectionBadgeProps {
  children: ReactNode;
}

export function SectionBadge({ children }: SectionBadgeProps) {
  return (
    <span className="inline-flex rounded-full border border-nkk-red/30 bg-nkk-red/10 px-4 py-2 text-xs font-extrabold tracking-[0.14em] text-nkk-red">
      {children}
    </span>
  );
}
