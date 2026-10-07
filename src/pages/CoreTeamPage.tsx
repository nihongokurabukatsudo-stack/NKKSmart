import { BadgeCheck, Home, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionBadge } from "../components/ui/SectionBadge";
import { coreTeamMembers } from "../data/coreTeam";

export function CoreTeamPage() {
  return (
    <main className="min-h-screen bg-nkk-background px-5 py-10 text-white sm:px-8 lg:py-14">
      <div className="mx-auto max-w-7xl">
        <Link to="/" aria-label="Kembali ke Beranda" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-zinc-300 transition hover:border-nkk-red hover:text-white"><Home size={19} /></Link>

        <header className="mt-8 max-w-4xl">
          <SectionBadge>TIM INTI</SectionBadge>
          <h1 className="mt-5 text-5xl font-black leading-tight sm:text-6xl">Pengurus NIHONGO KURABU KATSUDO</h1>
        </header>

        <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {coreTeamMembers.map((member) => (
            <article key={member.id} className="glass-panel rounded-3xl p-6 transition hover:-translate-y-1 hover:shadow-neon">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-nkk-red">
                <Users size={26} />
              </div>
              <h2 className="mt-6 text-2xl font-black">{member.name}</h2>
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-nkk-pink/10 px-3 py-1 text-xs font-black text-nkk-pink">
                <BadgeCheck size={14} />
                {member.role}
              </p>
              <p className="mt-4 text-sm font-bold text-white">{member.className}</p>
              <p className="mt-3 text-sm leading-7 text-zinc-300">{member.focus}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
