import { ArrowRight, BookOpen, Brain, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLearningProgress } from '../../lib/learningProgress'

export function LearningSection() {
  const [progress, setProgress] = useState(() => getLearningProgress())
  useEffect(() => {
    const refresh = () => setProgress(getLearningProgress())
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('storage', refresh) }
  }, [])

  return <section id="belajar" className="bg-nkk-background px-5 py-20 text-white sm:px-8 lg:py-24">
    <div className="mx-auto max-w-7xl">
      <article className="glass-panel overflow-hidden rounded-3xl p-6 sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black tracking-[.18em] text-nkk-pink">NKK LEARNING</p>
            <h2 className="mt-3 text-3xl font-black sm:text-5xl">Belajar bahasa Jepang bertahap</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">Kenali huruf, berlatih lewat quiz, dan pantau progress belajarmu. Lanjutkan dari lesson yang sudah tersedia.</p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-zinc-200"><span className="inline-flex items-center gap-2"><BookOpen size={17} className="text-nkk-pink"/>Materi huruf</span><span className="inline-flex items-center gap-2"><Brain size={17} className="text-nkk-pink"/>Quiz interaktif</span><span className="inline-flex items-center gap-2"><Trophy size={17} className="text-nkk-pink"/>Progress & XP</span></div>
          </div>
          <div className="min-w-56 rounded-2xl border border-white/10 bg-zinc-950/50 p-5"><p className="text-sm font-bold">Progress belajar</p><p className="mt-2 text-3xl font-black text-nkk-pink">{progress.learnedCharacters.length}<span className="text-base text-zinc-400"> / 92 huruf</span></p><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-nkk-red" style={{ width: `${Math.min(100, Math.round(progress.learnedCharacters.length * 100 / 92))}%` }}/></div><p className="mt-3 text-xs text-zinc-400">Level {Math.floor(progress.xp / 100) + 1} · {progress.xp} XP · streak {progress.streak} hari</p></div>
        </div>
        <Link to="/belajar" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-nkk-red px-5 text-sm font-black text-white transition hover:bg-nkk-redDark">Buka NKK Learning <ArrowRight size={17}/></Link>
      </article>
    </div>
  </section>
}
