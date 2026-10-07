import { Button } from "../ui/Button";

export function Hero() {
  return (
    <section className="relative min-h-[680px] overflow-hidden bg-nkk-background text-white">
      <img
        src="/assets/hero/hero-background.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      />
      <div className="hero-overlay absolute inset-0" />

      <div className="relative z-10 mx-auto flex min-h-[680px] max-w-7xl items-center px-5 pb-16 pt-28 sm:px-8 lg:pb-20">
        <div className="max-w-3xl">
          <div className="flex items-center gap-4">
            <img src="/assets/logo/logo-nkk-white.png" alt="Logo NKK" className="h-20 w-20 object-contain sm:h-24 sm:w-24" />
            <div>
              <p className="text-2xl font-black leading-none tracking-tight sm:text-4xl">
                NIHONGO <span className="text-nkk-red">KURABU KATSUDO</span>
              </p>
              <p className="mt-3 inline-flex rounded-full border border-white/15 bg-nkk-panel/70 px-4 py-2 text-[11px] font-extrabold tracking-[0.16em] text-zinc-200">
                SMK NEGERI 2 TASIKMALAYA
              </p>
            </div>
          </div>

          <h1 className="mt-9 max-w-2xl text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">
            Belajar Bersama Budaya Jepang
          </h1>
          <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-zinc-300 sm:text-lg">
            Tempat bertumbuh bagi siswa yang ingin mengenal bahasa Jepang, memperluas wawasan budaya, dan
            membangun pengalaman berorganisasi yang menyenangkan.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Button href="/register" isRouteLink>Gabung Sekarang</Button>
            <Button href="#tentang" variant="secondary">
              Pelajari Dulu
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
