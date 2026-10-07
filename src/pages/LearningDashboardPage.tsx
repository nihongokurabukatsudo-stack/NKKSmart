import { useEffect, useLayoutEffect, useState } from 'react'
import { ArrowRight, BookOpen, Brain, Flame, RotateCcw, Sparkles, Trophy, CalendarDays, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getLearningProgress, type LearningProgress } from '../lib/learningProgress'

const kanaLessons = [
  { id: 'hiragana', title: 'Hiragana', description: 'Kenali bentuk dan bacaan 46 huruf dasar.', path: '/belajar/hiragana', tone: 'from-rose-600/20' },
  { id: 'katakana', title: 'Katakana', description: 'Latih pengenalan bentuk dan bacaan Katakana.', path: '/belajar/katakana', tone: 'from-pink-600/20' },
]

export function LearningDashboardPage() {
  const [progress, setProgress] = useState<LearningProgress>(() => getLearningProgress())
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }) }, [])
  useEffect(() => {
    const refresh = () => setProgress(getLearningProgress())
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh) }
  }, [])

  const average = progress.quizAnswered ? Math.round(progress.quizCorrect * 100 / progress.quizAnswered) : 0
  const mistakes = Object.entries(progress.mistakes).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const level = Math.floor(progress.xp / 100) + 1
  const xpInLevel = progress.xp % 100
  const practicedToday = progress.dailyPracticeDate === new Date().toLocaleDateString('en-CA')

  return <main className="min-h-screen bg-nkk-background px-4 py-10 text-white sm:px-8 lg:py-14">
    <div className="mx-auto max-w-6xl">
      <header className="glass-panel overflow-hidden rounded-3xl p-6 sm:p-10">
        <p className="text-xs font-black tracking-[.18em] text-nkk-pink">NKK LEARNING</p>
        <div className="mt-3 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div><h1 className="text-3xl font-black sm:text-5xl">Belajar bahasa Jepang bertahap.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Belajar, latihan, lalu cek pemahamanmu. Progress tersimpan di perangkat ini.</p></div>
          <Link to={progress.learnedCharacters.length > 0 ? '/belajar/hiragana' : '/belajar/hiragana'} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-nkk-red px-5 font-bold text-white">Lanjut belajar <ArrowRight size={18}/></Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={<Sparkles/>} label={`Level ${level}`} value={`${progress.xp} XP`} />
          <Stat icon={<Flame/>} label="Streak belajar" value={`${progress.streak} hari`} />
          <Stat icon={<BookOpen/>} label="Huruf dipelajari" value={`${progress.learnedCharacters.length}/92`} />
          <Stat icon={<Trophy/>} label="Rata-rata quiz" value={progress.quizCount ? `${average}%` : 'Belum ada'} />
        </div>
        <div className="mt-5"><div className="mb-2 flex justify-between text-xs text-zinc-300"><span>Progress level</span><span>{xpInLevel}/100 XP</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-nkk-red to-nkk-pink" style={{ width: `${xpInLevel}%` }}/></div></div>
      </header>

      <section className="mt-10">
        <div className="mb-5"><p className="text-xs font-black tracking-[.16em] text-nkk-red">LEARNING PATH</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">Dasar huruf</h2></div>
        <div className="grid gap-4 md:grid-cols-2">
          {kanaLessons.map((lesson, index) => {
            const learned = progress.learnedCharacters.filter((id) => id.startsWith(index === 0 ? 'hira-' : 'kata-')).length
            const done = progress.completedLessons.includes(lesson.id)
            return <article key={lesson.id} className={`glass-panel rounded-2xl border-white/10 bg-gradient-to-br ${lesson.tone} to-transparent p-5 sm:p-6`}>
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Lesson {String(index + 1).padStart(2, '0')}</p><h3 className="mt-2 text-xl font-black">{lesson.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-300">{lesson.description}</p></div><span aria-label={done ? 'Selesai' : 'Belum selesai'} className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-zinc-200">{done ? 'Selesai' : `${learned}/46 huruf`}</span></div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-nkk-pink" style={{ width: `${Math.min(100, Math.round(learned * 100 / 46))}%` }}/></div>
              <div className="mt-5 flex flex-wrap gap-2"><Link to={lesson.path} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-nkk-red px-4 text-sm font-bold text-white">{learned ? 'Lanjutkan' : 'Mulai lesson'} <ArrowRight size={16}/></Link><Link to={`${lesson.path}/quiz`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold text-white"><Brain size={16}/> Quiz</Link></div>
            </article>
          })}
        </div>
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[.03] p-4 text-xs leading-5 text-zinc-400">Lesson kosakata dan tata bahasa akan ditambahkan berdasarkan dokumen materi resmi NKK. Dokumen sumber tersebut belum tersedia di file project ini.</p>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        <article className="glass-panel rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-2"><CalendarDays className="text-nkk-pink"/><h2 className="text-lg font-black">Latihan hari ini</h2></div><p className="mt-3 text-sm leading-6 text-zinc-300">5 soal acak dari materi huruf yang sudah tersedia. Selesaikan latihan untuk bonus 10 XP harian.</p><div className="mt-4 flex flex-wrap gap-2"><Link aria-disabled={practicedToday} to="/belajar/hiragana/quiz?daily=1" className={`inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-bold ${practicedToday ? 'pointer-events-none bg-white/10 text-zinc-500' : 'bg-nkk-red text-white'}`}>{practicedToday ? 'Selesai hari ini' : 'Mulai latihan'}</Link><Link to="/belajar/tes" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs font-bold"><Target size={15}/>Tes kemampuan</Link></div>{progress.placementScore !== null && <p className="mt-3 text-xs text-zinc-400">Hasil tes terakhir: {progress.placementScore}% · untuk rekomendasi belajar</p>}</article>
        <article className="glass-panel rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-2"><RotateCcw className="text-nkk-pink"/><h2 className="text-lg font-black">Perlu diulang</h2></div>{mistakes.length ? <ul className="mt-4 space-y-2">{mistakes.map(([key, count]) => { const [lessonId, questionId] = key.split(':'); const lesson = kanaLessons.find((item) => item.id === lessonId); return <li key={key} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-950/50 p-3"><span className="min-w-0 text-sm text-zinc-200">{lesson?.title || lessonId} · {questionId}</span><span className="shrink-0 text-xs text-zinc-400">{count}× salah</span></li> })}</ul> : <p className="mt-3 text-sm text-zinc-400">Belum ada soal yang perlu diulang. Selesaikan quiz untuk melihat review.</p>}<div className="mt-4 flex flex-wrap gap-2">{kanaLessons.map((lesson) => <Link key={lesson.id} to={`${lesson.path}/quiz?review=1`} className="inline-flex min-h-10 items-center rounded-lg border border-white/15 px-3 text-xs font-bold text-zinc-200">Review {lesson.title}</Link>)}</div></article>
        <article className="glass-panel rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-2"><Trophy className="text-amber-300"/><h2 className="text-lg font-black">Catatan progress</h2></div><p className="mt-3 text-sm leading-6 text-zinc-300">Kamu sudah menyelesaikan {progress.completedLessons.length} lesson dan mengikuti {progress.quizCount} quiz. Setiap jawaban membantu menentukan materi yang perlu kamu ulang.</p><div className="mt-4 rounded-xl bg-zinc-950/50 p-4"><p className="text-xs text-zinc-400">XP menuju Level {level + 1}</p><p className="mt-1 text-2xl font-black text-nkk-pink">{100 - xpInLevel} XP lagi</p></div></article>
      </section>
    </div>
  </main>
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4"><div className="flex items-center gap-2 text-nkk-pink">{icon}<span className="text-xs font-semibold text-zinc-400">{label}</span></div><p className="mt-2 text-xl font-black">{value}</p></div>
}
