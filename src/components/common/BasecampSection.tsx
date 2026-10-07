import { useEffect, useRef, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { googleMapsEmbedUrl, googleMapsUrl, schoolAddress } from "../../constants/school";
import { SectionBadge } from "../ui/SectionBadge";

export function BasecampSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.15 });
    const node = sectionRef.current;
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="basecamp" className="bg-nkk-background px-5 py-20 sm:px-8 lg:py-24">
      <div ref={sectionRef} className={`mx-auto max-w-7xl transition-all duration-700 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
        <div className="max-w-2xl">
          <SectionBadge>BASECAMP KAMI</SectionBadge>
          <h2 className="mt-5 text-4xl font-black leading-tight text-white sm:text-5xl">Tempat kami bertemu dan bertumbuh.</h2>
          <p className="mt-5 text-base leading-8 text-zinc-300">NIHONGO KURABU KATSUDO beraktivitas di lingkungan SMK Negeri 2 Tasikmalaya—ruang untuk belajar, berkarya, dan membangun kebersamaan.</p>
        </div>

        <div className="mt-10 grid overflow-hidden rounded-[2rem] border border-nkk-red/30 bg-nkk-panel shadow-[0_20px_70px_rgba(0,0,0,0.35)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-between p-7 sm:p-10">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-nkk-red/30 bg-nkk-red/10 text-nkk-red shadow-neon"><MapPin size={24} /></div>
              <p className="mt-7 text-xs font-black tracking-[0.18em] text-nkk-red">LOKASI RESMI</p>
              <h3 className="mt-3 text-2xl font-black text-white">SMK Negeri 2 Tasikmalaya</h3>
              <p className="mt-4 max-w-md leading-7 text-zinc-300">{schoolAddress}</p>
            </div>
            <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="mt-9 inline-flex w-fit items-center gap-2 rounded-2xl bg-nkk-red px-5 py-3 text-sm font-black text-white shadow-neon transition hover:-translate-y-0.5 hover:bg-nkk-redDark">
              Buka di Google Maps <ExternalLink size={16} />
            </a>
          </div>
          <iframe src={googleMapsEmbedUrl} title="Lokasi SMK Negeri 2 Tasikmalaya" className="min-h-80 w-full border-0 grayscale-[0.65] contrast-125 brightness-75 transition duration-500 hover:grayscale-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      </div>
    </section>
  );
}
