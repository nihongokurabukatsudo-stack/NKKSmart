import { ArrowRight, BookOpen, Brain, Headphones, MessageCircle, NotebookTabs, Volume2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { nkkLearningMaterials, unavailableSupplementalMaterials } from '../data/nkkLearningMaterials'
import { getLearningProgress } from '../lib/learningProgress'
import { speakJapanese } from '../lib/japaneseSpeech'

export function LearningDashboardPage() {
  const progress = getLearningProgress()
  const groups = [
    { title: 'Materi NKK', subtitle: 'Belajar dari Kitab Suci NKK', materials: nkkLearningMaterials },
    { title: 'Modul tambahan', subtitle: 'Materi resmi yang belum disertakan akan tersedia setelah modul diberikan', materials: unavailableSupplementalMaterials },
  ]

  return <main className="min-h-screen bg-nkk-background px-4 py-10 text-white sm:px-8 lg:py-14">
    <div className="mx-auto max-w-7xl">
      <header className="glass-panel rounded-3xl p-6 sm:p-10">
        <p className="text-xs font-black tracking-[.18em] text-nkk-pink">NKK LEARNING · BELAJAR MANDIRI</p>
        <h1 className="mt-3 text-3xl font-black sm:text-5xl">Belajar Bahasa Jepang</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">Gunakan materi dari Kitab Suci NKK, pelajari contoh, dengarkan pengucapan Jepang, lalu kerjakan latihan dan quiz. Penanda materi disimpan di perangkat ini.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/belajar/hiragana" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-nkk-red px-4 text-sm font-bold"><BookOpen size={17}/>Huruf Hiragana</Link>
          <Link to="/belajar/katakana" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold"><BookOpen size={17}/>Huruf Katakana</Link>
          <Link to="/belajar/hiragana/quiz?listening=1" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold"><Headphones size={17}/>Listening quiz</Link>
          <Link to="/belajar/tes" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold"><Brain size={17}/>Tes kemampuan</Link>
        </div>
      </header>

      {groups.map((group) => <section key={group.title} className="mt-10">
        <div className="mb-4"><h2 className="text-2xl font-black sm:text-3xl">{group.title}</h2><p className="mt-2 text-sm text-zinc-400">{group.subtitle}</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {group.materials.map((material) => {
            const href = `/belajar/materi/${material.id}`
            const done = progress.completedLessons.includes(material.id)
            return <article key={material.id} className="glass-panel flex min-h-52 flex-col rounded-2xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-widest text-nkk-pink">{material.category}</p><h3 className="mt-2 text-xl font-black">{material.title}</h3></div><span className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-bold text-zinc-300">{done ? 'Selesai' : 'Belum dipelajari'}</span></div>
              <p className="mt-3 flex-1 text-sm leading-6 text-zinc-300">{material.summary}</p>
              <p className="mt-3 text-xs text-zinc-500">Sumber: {material.source}</p>
              <Link to={href} className="mt-4 inline-flex min-h-10 items-center gap-2 self-start rounded-lg bg-white/10 px-3 text-sm font-bold hover:bg-white/15">Buka materi<ArrowRight size={16}/></Link>
            </article>
          })}
        </div>
      </section>)}

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <article className="glass-panel rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-2"><NotebookTabs className="text-nkk-pink"/><h2 className="text-lg font-black">Status materi</h2></div><p className="mt-3 text-sm leading-6 text-zinc-300">Gunakan penanda sederhana untuk mengingat materi yang sudah selesai. Tidak ada level, streak, hadiah, atau ranking belajar.</p><p className="mt-4 text-sm text-zinc-400">Materi yang selesai: {progress.completedLessons.map((id) => [...nkkLearningMaterials, ...unavailableSupplementalMaterials].find((item) => item.id === id)?.title).filter(Boolean).join(', ') || 'Belum ada'}</p></article>
        <article className="glass-panel rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-2"><MessageCircle className="text-nkk-pink"/><h2 className="text-lg font-black">Latihan dan pengucapan</h2></div><p className="mt-3 text-sm leading-6 text-zinc-300">Quiz huruf dibuat acak setiap sesi. Listening menggunakan suara Jepang ja-JP dari Speech Synthesis pada browser atau perangkat.</p><button type="button" onClick={() => speakJapanese('こんにちは。いっしょにべんきょうしましょう。')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold"><Volume2 size={17}/>Coba audio Jepang</button></article>
      </section>
    </div>
  </main>
}
