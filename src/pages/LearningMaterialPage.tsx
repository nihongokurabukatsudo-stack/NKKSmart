import { ArrowLeft, CheckCircle2, Volume2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { nkkLearningMaterials, unavailableSupplementalMaterials } from '../data/nkkLearningMaterials'
import { completeLearningLesson, getLearningProgress } from '../lib/learningProgress'
import { speakJapanese } from '../lib/japaneseSpeech'

export function LearningMaterialPage() {
  const { id = '' } = useParams()
  const material = [...nkkLearningMaterials, ...unavailableSupplementalMaterials].find((item) => item.id === id)
  const isComplete = getLearningProgress().completedLessons.includes(id)
  if (!material) return <main className="min-h-screen bg-nkk-background p-8 text-white"><h1 className="text-2xl font-black">Materi tidak ditemukan</h1><Link className="mt-4 inline-block text-nkk-pink underline" to="/belajar">Kembali ke NKK Learning</Link></main>

  return <main className="min-h-screen bg-nkk-background px-4 py-8 text-white sm:px-8 lg:py-12"><div className="mx-auto max-w-5xl">
    <Link to="/belajar" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-zinc-300 hover:text-white"><ArrowLeft size={17}/>Kembali ke perpustakaan</Link>
    <header className="glass-panel mt-6 rounded-3xl p-6 sm:p-9"><p className="text-xs font-black uppercase tracking-[.18em] text-nkk-pink">{material.category} · {material.source}</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">{material.title}</h1><p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">{material.summary}</p><p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-zinc-300"><CheckCircle2 size={15} className={isComplete ? 'text-emerald-300' : 'text-zinc-500'}/>{isComplete ? 'Selesai dipelajari' : 'Belum dipelajari'}</p></header>

    <section className="mt-6 space-y-4">{material.explanation.map((paragraph, index) => <article key={index} className="glass-panel rounded-2xl p-5 sm:p-7"><p className="text-sm leading-7 text-zinc-200 sm:text-base">{paragraph}</p></article>)}</section>

    {material.examples.length > 0 && <section className="mt-8"><h2 className="mb-4 text-2xl font-black">Contoh dan pengucapan</h2><div className="grid gap-3 sm:grid-cols-2">{material.examples.map((example, index) => <article key={`${example.japanese}-${index}`} className="glass-panel rounded-2xl p-5"><p lang="ja" className="break-words text-3xl font-black text-white sm:text-4xl">{example.japanese}</p>{example.romaji && <p className="mt-2 text-sm font-semibold text-nkk-pink">{example.romaji}</p>}{example.meaning && <p className="mt-1 text-sm text-zinc-300">{example.meaning}</p>}<button type="button" onClick={() => speakJapanese(example.japanese.replaceAll('→', ''))} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold hover:border-nkk-pink"><Volume2 size={17}/>Dengarkan Jepang</button></article>)}</div></section>}

    {material.practice && <section className="mt-8"><h2 className="mb-4 text-2xl font-black">Latihan mandiri</h2><ul className="space-y-3">{material.practice.map((item, index) => <li key={index} className="glass-panel rounded-xl p-4 text-sm leading-6 text-zinc-200"><span className="mr-2 font-black text-nkk-pink">{index + 1}.</span>{item}</li>)}</ul></section>}

    <div className="mt-8 flex flex-wrap gap-3"><button type="button" disabled={isComplete} onClick={() => { completeLearningLesson(id); window.location.reload() }} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-nkk-red px-5 text-sm font-black disabled:cursor-default disabled:opacity-60"><CheckCircle2 size={17}/>{isComplete ? 'Materi selesai' : 'Tandai selesai dipelajari'}</button><Link to="/belajar/hiragana/quiz" className="inline-flex min-h-12 items-center rounded-xl border border-white/15 px-5 text-sm font-bold">Latihan quiz huruf</Link></div>
    <p className="mt-6 text-xs leading-5 text-zinc-500">Romaji dan terjemahan mengikuti sumber Kitab Suci NKK. Koreksi editorial ditandai di dalam penjelasan bila sumber tampak tidak konsisten.</p>
  </div></main>
}
