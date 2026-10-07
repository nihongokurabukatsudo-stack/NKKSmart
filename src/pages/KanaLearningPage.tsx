import { BookOpen, Check, Home, Layers3, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { SectionBadge } from "../components/ui/SectionBadge";
import { useLocalKanaData } from "../hooks/useLocalKanaData";
import type { KanaCharacter } from "../types/kana";

interface KanaLearningPageProps {
  title: "Hiragana" | "Katakana";
  kanaCharacters: KanaCharacter[];
  description: string[];
  quizPath: string;
}

export function KanaLearningPage({ title, kanaCharacters, description, quizPath }: KanaLearningPageProps) {
  const { characters, errorMessage, isLoading } = useLocalKanaData(kanaCharacters);
  const [selectedCharacter, setSelectedCharacter] = useState<KanaCharacter | null>(null);
  const [learnedCharacterIds, setLearnedCharacterIds] = useState<string[]>([]);

  const markAsLearned = (kanaCharacter: KanaCharacter) => {
    setLearnedCharacterIds((currentIds) =>
      currentIds.includes(kanaCharacter.id) ? currentIds : [...currentIds, kanaCharacter.id],
    );
    setSelectedCharacter(kanaCharacter);
  };

  const learnedProgress = characters.length > 0 ? Math.round((learnedCharacterIds.length / characters.length) * 100) : 0;
  const exampleText = selectedCharacter
    ? `${selectedCharacter.character} dibaca "${selectedCharacter.romaji}". Latih dengan menyebutnya keras-keras sebelum lanjut ke huruf berikutnya.`
    : "";

  return (
    <main className="min-h-screen bg-nkk-background px-5 py-10 text-white sm:px-8 lg:py-14">
      <div className="mx-auto max-w-7xl">
        <Link to="/" aria-label="Kembali ke Beranda" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-zinc-300 transition hover:border-nkk-red hover:text-white">
          <Home size={19} />
        </Link>

        <header className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.55fr] lg:items-end">
          <div className="max-w-3xl">
            <SectionBadge>BELAJAR HURUF JEPANG</SectionBadge>
            <h1 className="mt-5 text-5xl font-black leading-tight text-white sm:text-6xl">{title}</h1>
            <div className="mt-5 grid gap-4 text-base leading-8 text-zinc-300">
              {description.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-nkk-red/10 text-nkk-red">
                <Layers3 size={22} />
              </div>
              <div>
                <p className="text-sm font-black text-white">Progress Belajar</p>
                <p className="text-xs font-bold text-zinc-400">{learnedCharacterIds.length} dari {characters.length} huruf dibuka</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-nkk-red transition-all" style={{ width: `${learnedProgress}%` }} />
            </div>
          </div>
        </header>

        <section className="mt-10">
          {isLoading && <LoadingState />}

          {!isLoading && errorMessage && <ErrorState message={errorMessage} />}

          {!isLoading && !errorMessage && characters.length === 0 && (
            <EmptyState title="Data Kosong" description={`Data ${title} belum tersedia.`} />
          )}

          {!isLoading && !errorMessage && characters.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {characters.map((kanaCharacter) => (
                  <button
                    key={kanaCharacter.id}
                    type="button"
                    className="group h-28 rounded-2xl text-left [perspective:900px] sm:h-32"
                    onClick={() => markAsLearned(kanaCharacter)}
                  >
                    <span className="relative block h-full rounded-2xl transition duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                      <span className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-nkk-panel p-3 shadow-soft [backface-visibility:hidden] group-hover:border-nkk-red/35">
                        {learnedCharacterIds.includes(kanaCharacter.id) && (
                          <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-nkk-red text-zinc-950">
                            <Check size={15} />
                          </span>
                        )}
                        <span className="text-4xl font-black leading-none text-nkk-red sm:text-5xl">
                          {kanaCharacter.character}
                        </span>
                        <span className="mt-3 text-xs font-bold text-zinc-400">Klik untuk detail</span>
                      </span>
                      <span className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-nkk-pink/30 bg-nkk-pink/10 p-3 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                        <span className="text-sm font-black tracking-[0.18em] text-nkk-pink">ROMAJI</span>
                        <span className="mt-2 text-3xl font-black text-white">{kanaCharacter.romaji}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-10 flex justify-center">
                <Link
                  to={quizPath}
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-nkk-red px-7 py-4 text-sm font-black text-zinc-950 shadow-neon transition hover:bg-white"
                >
                  <BookOpen size={18} />
                  Play Quiz
                </Link>
              </div>
            </>
          )}
        </section>
      </div>

      {selectedCharacter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 px-5 backdrop-blur-sm">
          <article className="glass-panel w-full max-w-md rounded-3xl p-6 text-center">
            <button
              type="button"
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 text-zinc-300 transition hover:bg-white/10 hover:text-white"
              onClick={() => setSelectedCharacter(null)}
              aria-label="Tutup detail huruf"
            >
              <X size={18} />
            </button>
            <p className="text-8xl font-black leading-none text-nkk-red">{selectedCharacter.character}</p>
            <p className="mt-5 text-sm font-black tracking-[0.18em] text-nkk-pink">ROMAJI</p>
            <h2 className="mt-2 text-4xl font-black text-white">{selectedCharacter.romaji}</h2>
            <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-zinc-300">
              {exampleText}
            </p>
          </article>
        </div>
      )}
    </main>
  );
}
