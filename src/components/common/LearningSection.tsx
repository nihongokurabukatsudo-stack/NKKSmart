import { ArrowRight, BookOpen, Brain, Headphones } from 'lucide-react'
import { Link } from 'react-router-dom'

export function LearningSection() {
  return <section id="belajar" className="bg-nkk-background px-5 py-20 text-white sm:px-8 lg:py-24">
    <div className="mx-auto max-w-7xl"><article className="glass-panel overflow-hidden rounded-3xl p-6 sm:p-10">
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]"><div>
        <p className="text-xs font-black tracking-[.18em] text-nkk-pink">NKK LEARNING</p>
        <h2 className="mt-3 text-3xl font-black sm:text-5xl">Belajar Bahasa Jepang mandiri</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">Pelajari huruf, kosakata, tata bahasa, dan percakapan dari materi NKK. Lengkapi dengan latihan, quiz, dan audio bahasa Jepang.</p>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-zinc-200"><span className="inline-flex items-center gap-2"><BookOpen size={17} className="text-nkk-pink"/>Materi NKK</span><span className="inline-flex items-center gap-2"><Brain size={17} className="text-nkk-pink"/>Latihan dan quiz</span><span className="inline-flex items-center gap-2"><Headphones size={17} className="text-nkk-pink"/>Japanese listening</span></div>
      </div><div className="hidden h-36 w-36 items-center justify-center rounded-3xl border border-white/10 bg-zinc-950/40 text-nkk-pink lg:flex"><BookOpen size={56}/></div></div>
      <Link to="/belajar" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-nkk-red px-5 text-sm font-black text-white transition hover:bg-nkk-redDark">Buka NKK Learning <ArrowRight size={17}/></Link>
    </article></div>
  </section>
}
