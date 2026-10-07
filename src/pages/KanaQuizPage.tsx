import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { SectionBadge } from "../components/ui/SectionBadge";
import { useLocalKanaData } from "../hooks/useLocalKanaData";
import type { KanaCharacter, QuizQuestion } from "../types/kana";
import { createQuizQuestions } from "../utils/quiz";
import { completeDailyPractice, getMistakeIds, recordLearningQuiz } from "../lib/learningProgress";

interface KanaQuizPageProps {
  title: "Hiragana" | "Katakana";
  kanaCharacters: KanaCharacter[];
  learningPath: string;
}

export function KanaQuizPage({ title, kanaCharacters, learningPath }: KanaQuizPageProps) {
  const { characters, errorMessage, isLoading } = useLocalKanaData(kanaCharacters);
  const [searchParams] = useSearchParams();
  const reviewMode = searchParams.get('review') === '1';
  const dailyMode = searchParams.get('daily') === '1';
  const questionCount = dailyMode ? 5 : 10;
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [wrongQuestionIds, setWrongQuestionIds] = useState<string[]>([]);
  const hasRecordedResult = useRef(false);

  useEffect(() => {
    if (characters.length > 0 && quizQuestions.length === 0) {
      setQuizQuestions(createQuizQuestions(characters, reviewMode ? getMistakeIds(title.toLowerCase()) : [], questionCount));
    }
  }, [characters, quizQuestions.length, reviewMode, title, questionCount]);

  useEffect(() => {
    if (!isQuizFinished || hasRecordedResult.current) return;
    hasRecordedResult.current = true;
    recordLearningQuiz(title.toLowerCase(), quizQuestions, wrongQuestionIds, quizScore);
    if (dailyMode) completeDailyPractice();
  }, [isQuizFinished, quizQuestions, title, wrongQuestionIds, quizScore, dailyMode]);

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const totalQuestions = quizQuestions.length;

  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer || !currentQuestion) {
      return;
    }

    setSelectedAnswer(answer);

    if (answer === currentQuestion.correctAnswer) {
      setQuizScore((currentScore) => currentScore + 1);
    } else {
      setWrongQuestionIds((currentIds) => currentIds.includes(currentQuestion.id) ? currentIds : [...currentIds, currentQuestion.id]);
    }

    window.setTimeout(() => {
      const nextQuestionIndex = currentQuestionIndex + 1;

      if (nextQuestionIndex >= totalQuestions) {
        setIsQuizFinished(true);
        return;
      }

      setCurrentQuestionIndex(nextQuestionIndex);
      setSelectedAnswer(null);
    }, 650);
  };

  const restartQuiz = () => {
    setQuizQuestions(createQuizQuestions(characters, reviewMode ? getMistakeIds(title.toLowerCase()) : [], questionCount));
    setCurrentQuestionIndex(0);
    setQuizScore(0);
    setSelectedAnswer(null);
    setIsQuizFinished(false);
    setWrongQuestionIds([]);
    hasRecordedResult.current = false;
  };

  const getAnswerClassName = (answer: string) => {
    if (!selectedAnswer || !currentQuestion) {
      return "border-white/10 bg-nkk-panel hover:border-white/30 hover:bg-white/10";
    }

    if (answer === currentQuestion.correctAnswer) {
      return "border-emerald-400/70 bg-emerald-500/18 text-white";
    }

    if (answer === selectedAnswer) {
      return "border-nkk-pink/80 bg-nkk-pink/18 text-white";
    }

    return "border-white/10 bg-nkk-panel text-zinc-400";
  };

  return (
    <main className="min-h-screen bg-nkk-background px-5 py-10 text-white sm:px-8 lg:py-14">
      <div className="mx-auto max-w-4xl">
        <Link to={learningPath} className="text-sm font-bold text-zinc-300 transition hover:text-white">
          Kembali ke Materi {title}
        </Link>

        <header className="mt-8">
          <SectionBadge>{dailyMode ? 'LATIHAN HARI INI' : reviewMode ? 'REVIEW KESALAHAN' : `QUIZ ${title.toUpperCase()}`}</SectionBadge>
          <h1 className="mt-5 text-5xl font-black leading-tight text-white sm:text-6xl">Tebak Bacaan Huruf</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
            Pilih romaji yang sesuai dengan huruf yang tampil. Setiap sesi berisi {questionCount} soal acak.
          </p>
        </header>

        <section className="mt-10">
          {isLoading && <LoadingState />}

          {!isLoading && errorMessage && <ErrorState message={errorMessage} />}

          {!isLoading && !errorMessage && characters.length === 0 && (
            <EmptyState title="Data Kosong" description={`Data quiz ${title} belum tersedia.`} />
          )}

          {!isLoading && !errorMessage && currentQuestion && !isQuizFinished && (
            <div className="rounded-lg border border-white/10 bg-nkk-panelSoft p-5 shadow-soft sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-extrabold text-zinc-300">
                  Soal {currentQuestionIndex + 1}/{totalQuestions}
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 sm:max-w-xs">
                  <div
                    className="h-full rounded-full bg-nkk-red transition-all"
                    style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                  />
                </div>
              </div>

              <div className="py-12 text-center">
                <p className="text-8xl font-black leading-none text-nkk-red sm:text-9xl">
                  {currentQuestion.character}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {currentQuestion.answerOptions.map((answer) => (
                  <button
                    key={answer}
                    type="button"
                    className={`min-h-14 rounded-lg border px-5 py-4 text-lg font-black transition ${getAnswerClassName(answer)}`}
                    onClick={() => handleAnswerSelect(answer)}
                    disabled={Boolean(selectedAnswer)}
                  >
                    {answer}{selectedAnswer && answer === currentQuestion.correctAnswer && <span className="ml-2 text-sm">✓ Benar</span>}{selectedAnswer === answer && answer !== currentQuestion.correctAnswer && <span className="ml-2 text-sm">× Belum tepat</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isLoading && !errorMessage && isQuizFinished && (
            <div className="rounded-lg border border-white/10 bg-nkk-panel p-8 text-center shadow-soft">
              <p className="text-sm font-extrabold tracking-[0.14em] text-zinc-300">SKOR AKHIR</p>
              <h2 className="mt-4 text-5xl font-black text-white">
                {quizScore}/{totalQuestions} benar
              </h2>
              <p className="mt-2 text-lg font-bold text-nkk-pink">Akurasi {totalQuestions ? Math.round(quizScore * 100 / totalQuestions) : 0}% · +{quizScore === totalQuestions ? 30 : 20}{dailyMode ? ' + bonus harian 10' : ''} XP</p>
              <p className="mt-4 text-base leading-8 text-zinc-300">
                Mantap. Ulangi quiz untuk mendapatkan kombinasi soal baru.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-nkk-red px-7 py-3 text-sm font-black text-zinc-950 shadow-neon transition hover:bg-white"
                  onClick={restartQuiz}
                >
                  Main Lagi
                </button>
                <Link
                  to={learningPath}
                  className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/70 px-7 py-3 text-sm font-extrabold text-white transition hover:bg-white/10"
                >
                  Lihat Materi
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
