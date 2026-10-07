import { Button } from "../ui/Button";

const learningCards = [
  {
    character: "あ",
    title: "Hiragana",
    subtitle: "46 Huruf Dasar",
    path: "/belajar/hiragana",
  },
  {
    character: "ア",
    title: "Katakana",
    subtitle: "46 Huruf Dasar",
    path: "/belajar/katakana",
  },
];

export function LearningSection() {
  return (
    <section id="belajar" className="bg-nkk-background px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-5 md:grid-cols-2">
          {learningCards.map((card) => (
            <article key={card.title} className="glass-panel rounded-3xl p-7 transition hover:-translate-y-1 hover:shadow-neon sm:p-9">
              <p className="text-7xl font-black leading-none text-nkk-red sm:text-8xl">{card.character}</p>
              <h2 className="mt-7 text-3xl font-black text-white sm:text-4xl">{card.title}</h2>
              <p className="mt-2 text-base font-bold text-zinc-300">{card.subtitle}</p>
              <Button href={card.path} isRouteLink variant="dark" className="mt-8">
                Belajar
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
