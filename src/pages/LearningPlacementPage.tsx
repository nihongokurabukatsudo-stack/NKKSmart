import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react'
import type { KanaCharacter, QuizQuestion } from '../types/kana'
import { createQuizQuestions } from '../utils/quiz'
import { recordPlacementResult } from '../lib/learningProgress'

export function LearningPlacementPage({ characters }: { characters: KanaCharacter[] }) {
  const [questions, setQuestions] = useState(() => createQuizQuestions(characters, [], 20))
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const current: QuizQuestion | undefined = questions[index]

  const choose = (value: string) => {
    if (answer || !current) return
    setAnswer(value)
    const isCorrect = value === current.correctAnswer
    if (isCorrect) setCorrect((score) => score + 1)
    window.setTimeout(() => {
      if (index + 1 >= questions.length) {
        const finalScore = correct + Number(isCorrect)
        setCorrect(finalScore)
        recordPlacementResult(finalScore, questions.length)
        setFinished(true)
      } else {
        setIndex((position) => position + 1)
        setAnswer(null)
      }
    }, 650)
  }

  const restart = () => { setQuestions(createQuizQuestions(characters, [], 20)); setIndex(0); setCorrect(0); setAnswer(null); setFinished(false) }
  const score = questions.length ? Math.round(correct * 100 / questions.length) : 0

  return <main className="min-h-screen bg-nkk-background px-4 py-10 text-white sm:px-8"><div className="mx-auto max-w-3xl">
    <Link to="/belajar" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-zinc-300 hover:text-white"><ArrowLeft size={17}/>Kembali ke NKK Learning</Link>
    <header className="mt-8"><p className="text-xs font-black tracking-[.16em] text-nkk-pink">TES KEMAMPUAN</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Cek pengenalan huruf</h1><p className="mt-3 text-sm leading-6 text-zinc-300">20 soal Hiragana dan Katakana. Hasil ini hanya rekomendasi belajar, bukan penilaian atau ranking.</p></header>
    {!finished && current && <section className="glass-panel mt-8 rounded-3xl p-5 sm:p-8"><div className="flex items-center justify-between gap-3 text-sm"><span className="font-bold">Soal {index + 1}/{questions.length}</span><span className="text-zinc-400">{Math.round((index + 1) * 100 / questions.length)}%</span></div><div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-nkk-red" style={{ width: `${(index + 1) * 100 / questions.length}%` }}/></div><p className="py-12 text-center text-8xl font-black text-nkk-pink">{current.character}</p><div className="grid gap-3 sm:grid-cols-2">{current.answerOptions.map((option) => <button key={option} type="button" disabled={Boolean(answer)} onClick={() => choose(option)} className={`min-h-14 rounded-xl border p-4 text-lg font-bold ${answer ? option === current.correctAnswer ? 'border-emerald-400 bg-emerald-500/15' : option === answer ? 'border-rose-400 bg-rose-500/15' : 'border-white/10 opacity-60' : 'border-white/10 bg-white/5 hover:border-nkk-pink'}`}>{option}{answer && option === current.correctAnswer && <span className="ml-2 text-xs">✓ Benar</span>}{answer === option && option !== current.correctAnswer && <span className="ml-2 text-xs">Belum tepat</span>}</button>)}</div></section>}
    {finished && <section className="glass-panel mt-8 rounded-3xl p-6 text-center sm:p-10"><CheckCircle2 className="mx-auto h-12 w-12 text-nkk-pink"/><p className="mt-4 text-xs font-black tracking-widest text-zinc-400">HASIL TES</p><h2 className="mt-2 text-5xl font-black">{correct}/{questions.length}</h2><p className="mt-2 text-2xl font-black text-nkk-pink">{score}%</p><p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-zinc-300">{score >= 80 ? 'Kamu sudah cukup lancar mengenali huruf. Coba lanjutkan dengan quiz per lesson.' : 'Mulai dari lesson Hiragana atau Katakana, lalu ulangi tes ini kapan saja.'} Hasil ini bukan ranking.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={restart} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold"><RotateCcw size={16}/>Ulangi tes</button><Link to="/belajar" className="inline-flex min-h-11 items-center rounded-xl bg-nkk-red px-4 text-sm font-bold">Lihat rekomendasi</Link></div></section>}
  </div></main>
}
